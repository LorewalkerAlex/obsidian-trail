import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailConfiguration } from "../../domain/trail-configuration";
import {
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import { sameTrailProject, type TrailProject } from "../../domain/trail-project";
import { validateWorkflowProjectState } from "../../domain/validation/trail-workflow-validation";
import {
  TRAIL_PROJECTS_PATH,
  TRAIL_PROJECTS_PREFIX,
} from "../../markdown/schema/trail-paths";
import { submitTrailMutation } from "../../mutation/coordinator/trail-mutation-coordinator";
import { executeTrailSingleTransaction } from "../../mutation/execution/trail-single-transaction-executor";
import { createTrailProjectPathAllocator } from "../../mutation/physical/trail-file-backed-entity-path-allocator";
import { materializeTrailSingleTransactionPlan } from "../../mutation/physical/trail-single-transaction-plan";
import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import type { TrailProjectSourceSnapshot } from "../../persistence/domain-sources/trail-domain-source-snapshot";
import {
  toTrailSourceProblems,
  type TrailProjectSourceResult,
} from "../../persistence/domain-sources/trail-source-result";
import {
  TrailWorkflowPersistenceError,
  type TrailWorkflowPersistence,
  type TrailWorkflowSnapshot,
} from "../../persistence/domain-sources/trail-workflow-persistence";
import {
  reconcileProjectContribution,
  removeProjectContribution,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  selectAllSourceIssues,
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";

export type TrailProjectSourceActionKind =
  | "workflow.issue.create"
  | "workflow.issue.status"
  | "workflow.project.create";

export type TrailProjectSourceMutationErrorCode =
  | "conflict"
  | "persistence-failed"
  | "source-invalid"
  | "verification-failed";

export class TrailProjectSourceMutationError extends Error {
  public constructor(
    readonly code: TrailProjectSourceMutationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailProjectSourceMutationError";
  }
}

export interface TrailProjectSourceMutationRequest {
  readonly actionKind: TrailProjectSourceActionKind;
  readonly correlationId: string;
  readonly entity: TrailProject | TrailWorkflowIssue;
  readonly plan: TrailMutationPlan;
}

function errorCategory(error: unknown): string {
  if (error instanceof TrailProjectSourceMutationError) return error.code;
  if (error instanceof TrailWorkflowPersistenceError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown-error";
}

function validationIssueCodes(issues: readonly { readonly code: string }[]): readonly string[] {
  return issues.map((issue) => issue.code);
}

function workflowIssueCount(store: TrailRuntimeStore): number {
  return Object.values(store.getState().committed.authoritative.domain.issuesById)
    .filter((issue) => issue.context === "workflow").length;
}

/** Owns authoritative Project-source refresh, persistence verification, and Runtime reconciliation. */
export class TrailProjectSourceSync {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailWorkflowPersistence,
    private readonly configuration: TrailConfiguration,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public async initialize(correlationId?: string): Promise<void> {
    this.diagnostics.record("workflow.initialize.started", { correlationId });
    const snapshot = await this.persistence.readAll();
    this.applySnapshot(snapshot, "initialize", correlationId, false);
    const state = this.runtimeStore.getState();
    this.diagnostics.record("workflow.initialize.completed", {
      correlationId,
      data: {
        projectCount: Object.keys(state.committed.authoritative.domain.projectsById).length,
        sourceIssueCount: selectAllSourceIssues(state).length,
        workflowIssueCount: workflowIssueCount(this.runtimeStore),
      },
    });
  }

  public async refreshAll(correlationId?: string): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      const snapshot = await this.persistence.readAll();
      this.applySnapshot(snapshot, "external-rescan", correlationId, true);
    }, { correlationId, kind: "workflow.refresh-all" });
  }

  public async refreshSource(filePath: string, correlationId?: string): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      const result = await this.persistence.readSource(filePath);
      this.consumeReadResult(result, "external-refresh", correlationId);
    }, { correlationId, kind: "workflow.refresh-source" });
  }

  public async removeSource(filePath: string, correlationId?: string): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      removeProjectContribution(this.runtimeStore, filePath);
      this.diagnostics.record("runtime.workflow.source-removed", {
        correlationId,
        data: { filePath },
        level: "warn",
      });
    }, { correlationId, kind: "workflow.remove-source" });
  }

  public submit(request: TrailProjectSourceMutationRequest) {
    const { actionKind, correlationId, entity, plan } = request;
    const entityId = entity.id;
    let affectedPath: string | undefined;
    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: async () => {
          const persisted = await this.persistPlan(plan, entity, actionKind, correlationId);
          affectedPath = persisted.contribution?.filePath ?? persisted.issues[0]?.filePath;
          return persisted;
        },
        mapError: (error) => this.mapMutationError(error),
        onCommitted: () => {
          this.diagnostics.record("command.committed", {
            correlationId,
            data: { entityId, kind: actionKind },
          });
        },
        onFailed: (error) => {
          this.diagnostics.record("command.failed", {
            correlationId,
            data: { category: errorCategory(error), entityId, kind: actionKind },
            level: "error",
          });
        },
        optimisticData: { entityId },
        plan,
        queueKind: actionKind,
        recover: async () => {
          await this.reconcileAfterFailure(affectedPath, correlationId);
        },
        settle: (persisted) => {
          const contribution = this.verifyPersistedResult(
            entity,
            persisted,
            correlationId,
            actionKind,
          );
          affectedPath = contribution.filePath;
          this.reconcileContribution(contribution, actionKind, correlationId);
        },
      },
      this.diagnostics,
    );
    return { completion, entityId };
  }

  private async persistPlan(
    plan: TrailMutationPlan,
    entity: TrailProject | TrailWorkflowIssue,
    actionKind: TrailProjectSourceActionKind,
    correlationId: string,
  ): Promise<TrailProjectSourceResult> {
    const allocateProjectPath = createTrailProjectPathAllocator(
      () => this.persistence.listProjectSources(),
    );
    const physicalPlan = await materializeTrailSingleTransactionPlan(
      plan,
      this.runtimeStore.getState().committed,
      { allocateProjectPath },
    );

    if (
      actionKind !== "workflow.project.create"
      && selectSourceIssuesForPath(
        this.runtimeStore.getState(),
        physicalPlan.sourcePath,
      ).length > 0
    ) {
      throw new TrailProjectSourceMutationError(
        "source-invalid",
        "Project source is invalid; review the source before retrying",
      );
    }

    this.diagnostics.record("workflow.persistence.write.started", {
      correlationId,
      data: {
        filePath: physicalPlan.sourcePath,
        kind: actionKind,
        projectId: "context" in entity ? entity.projectId ?? null : entity.id,
        issueId: "context" in entity ? entity.id : null,
      },
    });

    const executed = await executeTrailSingleTransaction(
      physicalPlan,
      { projectCreate: this.persistence, workflow: this.persistence },
      correlationId,
    );
    if (executed.kind !== "project-source") {
      throw new TrailProjectSourceMutationError(
        "verification-failed",
        "Workflow single transaction returned a non-Project source result",
      );
    }
    return executed.result;
  }

  private verifyPersistedResult(
    entity: TrailProject | TrailWorkflowIssue,
    persisted: TrailProjectSourceResult,
    correlationId: string,
    kind: TrailProjectSourceActionKind,
  ): TrailProjectSourceSnapshot {
    const filePath = persisted.contribution?.filePath ?? persisted.issues[0]?.filePath;
    if (persisted.issues.length > 0 || persisted.contribution === undefined) {
      if (filePath !== undefined) {
        setSourceIssuesForPath(this.runtimeStore, filePath, persisted.issues);
      }
      this.diagnostics.record("workflow.validation.failed", {
        correlationId,
        data: {
          issueCodes: validationIssueCodes(persisted.issues),
          kind,
          reason: "physical-post-write",
        },
        level: "error",
      });
      throw new TrailProjectSourceMutationError(
        "verification-failed",
        "Persisted Workflow source failed source validation",
      );
    }

    const domainIssues = validateWorkflowProjectState(
      persisted.contribution,
      this.configuration,
    );
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(
        this.runtimeStore,
        persisted.contribution.filePath,
        toTrailSourceProblems(persisted.contribution.filePath, domainIssues),
      );
      this.diagnostics.record("workflow.validation.failed", {
        correlationId,
        data: {
          issueCodes: validationIssueCodes(domainIssues),
          kind,
          reason: "domain-post-write",
        },
        level: "error",
      });
      throw new TrailProjectSourceMutationError(
        "verification-failed",
        "Persisted Workflow source failed Domain validation",
      );
    }

    const matchesPlan = "context" in entity
      ? (() => {
          const persistedIssue = persisted.contribution.issuesById[entity.id];
          return persistedIssue !== undefined
            && sameTrailWorkflowIssue(persistedIssue, entity);
        })()
      : sameTrailProject(persisted.contribution.project, entity);
    if (!matchesPlan) {
      throw new TrailProjectSourceMutationError(
        "verification-failed",
        "Persisted Workflow mutation did not match the planned result",
      );
    }

    this.diagnostics.record("workflow.validation.completed", {
      correlationId,
      data: { filePath: persisted.contribution.filePath, kind },
    });
    return persisted.contribution;
  }

  private consumeReadResult(
    result: TrailProjectSourceResult,
    reason: string,
    correlationId?: string,
  ): void {
    const filePath = result.contribution?.filePath ?? result.issues[0]?.filePath;
    if (result.issues.length > 0 || result.contribution === undefined) {
      if (filePath !== undefined) {
        setSourceIssuesForPath(this.runtimeStore, filePath, result.issues);
      }
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: filePath ?? null,
          issueCodes: validationIssueCodes(result.issues),
          reason,
        },
        level: "warn",
      });
      return;
    }

    const domainIssues = validateWorkflowProjectState(
      result.contribution,
      this.configuration,
    );
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(
        this.runtimeStore,
        result.contribution.filePath,
        toTrailSourceProblems(result.contribution.filePath, domainIssues),
      );
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: result.contribution.filePath,
          issueCodes: validationIssueCodes(domainIssues),
          reason,
        },
        level: "warn",
      });
      return;
    }

    try {
      this.reconcileContribution(result.contribution, reason, correlationId);
    } catch (error: unknown) {
      const issue = {
        code: "workflow.source.identity-conflict",
        filePath: result.contribution.filePath,
        message: error instanceof Error ? error.message : "Workflow identity conflict",
        scope: "file" as const,
      };
      setSourceIssuesForPath(this.runtimeStore, result.contribution.filePath, [issue]);
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: result.contribution.filePath,
          issueCodes: [issue.code],
          reason,
        },
        level: "warn",
      });
    }
  }

  private applySnapshot(
    snapshot: TrailWorkflowSnapshot,
    reason: string,
    correlationId: string | undefined,
    removeMissingSources: boolean,
  ): void {
    const resultPaths = new Set<string>();
    for (const result of snapshot.projectResults) {
      const filePath = result.contribution?.filePath ?? result.issues[0]?.filePath;
      if (filePath !== undefined) resultPaths.add(filePath);
    }

    if (removeMissingSources) {
      const state = this.runtimeStore.getState();
      for (const filePath of Object.keys(state.committed.ownership.sourceEntityIdsByPath)) {
        if (filePath.startsWith(TRAIL_PROJECTS_PREFIX) && !resultPaths.has(filePath)) {
          removeProjectContribution(this.runtimeStore, filePath);
        }
      }
      for (const filePath of Object.keys(state.health.sourceIssuesByPath)) {
        if (
          filePath === TRAIL_PROJECTS_PATH
          || filePath.startsWith(TRAIL_PROJECTS_PREFIX)
        ) {
          setSourceIssuesForPath(this.runtimeStore, filePath, []);
        }
      }
    }

    for (const result of snapshot.projectResults) {
      this.consumeReadResult(result, reason, correlationId);
    }

    const structuralByPath = new Map<string, typeof snapshot.structuralIssues>();
    for (const issue of snapshot.structuralIssues) {
      const current = structuralByPath.get(issue.filePath) ?? [];
      structuralByPath.set(issue.filePath, [...current, issue]);
    }
    for (const [filePath, structuralIssues] of structuralByPath) {
      const existing = selectSourceIssuesForPath(this.runtimeStore.getState(), filePath);
      setSourceIssuesForPath(
        this.runtimeStore,
        filePath,
        [...existing, ...structuralIssues],
      );
    }
  }

  private reconcileContribution(
    contribution: TrailProjectSourceSnapshot,
    reason: string,
    correlationId?: string,
  ): void {
    const result = reconcileProjectContribution(this.runtimeStore, contribution);
    this.diagnostics.record("runtime.workflow.reconciled", {
      correlationId,
      data: {
        addedIssueIds: result.diff.addedIssueIds,
        changedIssueFieldsById: result.diff.changedIssueFieldsById,
        changedIssueIds: result.diff.changedIssueIds,
        committedRevision: result.revision,
        issueCount: result.issueCount,
        projectChangedFields: result.diff.projectChangedFields,
        projectCount: result.projectCount,
        projectId: result.diff.projectId,
        projectWasAdded: result.diff.projectWasAdded,
        reason,
        removedIssueIds: result.diff.removedIssueIds,
      },
    });
  }

  private async reconcileAfterFailure(
    filePath: string | undefined,
    correlationId: string,
  ): Promise<void> {
    try {
      if (filePath !== undefined) {
        this.consumeReadResult(
          await this.persistence.readSource(filePath),
          "failure-reconcile",
          correlationId,
        );
        return;
      }
      const snapshot = await this.persistence.readAll();
      for (const issue of snapshot.structuralIssues) {
        setSourceIssuesForPath(this.runtimeStore, issue.filePath, [issue]);
      }
      for (const result of snapshot.projectResults) {
        this.consumeReadResult(result, "failure-reconcile", correlationId);
      }
    } catch (error: unknown) {
      this.diagnostics.record("workflow.failure-reconcile.failed", {
        correlationId,
        data: { category: errorCategory(error), filePath: filePath ?? null },
        level: "error",
      });
    }
  }

  private mapMutationError(error: unknown): TrailProjectSourceMutationError {
    if (error instanceof TrailProjectSourceMutationError) return error;
    if (error instanceof TrailWorkflowPersistenceError) {
      if (error.code === "conflict" || error.code === "target-missing") {
        return new TrailProjectSourceMutationError(
          "conflict",
          "Workflow source changed outside Trail. Review the latest state and try again.",
          error,
        );
      }
      if (error.code === "source-invalid") {
        return new TrailProjectSourceMutationError(
          "source-invalid",
          "Project source became invalid before the mutation could be saved",
          error,
        );
      }
      return new TrailProjectSourceMutationError(
        "verification-failed",
        "Workflow persistence failed verification",
        error,
      );
    }
    return new TrailProjectSourceMutationError(
      "persistence-failed",
      "Workflow change could not be persisted",
      error,
    );
  }
}
