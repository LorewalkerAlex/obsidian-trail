import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import {
  executeTrailSourceTransition,
  type TrailSourceTransitionOutcome,
  type TrailTransitionObservation,
} from "../mutation/execution/trail-source-transition-executor";
import { executeTrailSingleTransaction } from "../mutation/execution/trail-single-transaction-executor";
import {
  materializeTrailSourceTransitionPlan,
  type TrailSourceTransitionPlan,
} from "../mutation/physical/trail-source-transition-plan";
import type { TrailSingleTransactionPlan } from "../mutation/physical/trail-single-transaction-plan";
import {
  mergeTrailMutationPlans,
  type TrailMutationPlan,
} from "../mutation/plans/trail-mutation-plan";
import {
  resolveDefaultStatusDefinition,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "./trail-configuration";
import {
  isTrailEpochMilliseconds,
  sameTrailTriageIssue,
  sameTrailWorkflowIssue,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "./trail-issue";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-physical-schema";
import type { TrailProject } from "./trail-project";
import {
  ProjectMarkdownMutationError,
  type TrailProjectContribution,
  type TrailProjectParseResult,
} from "./trail-project-markdown";
import {
  addPendingPlan,
  reconcileProjectContribution,
  reconcileTriageContribution,
  removePendingPlan,
  selectEffectiveEntityIdSet,
  selectEffectiveProjectById,
  selectEffectiveTriageIssueById,
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  setTriageSourceIssues,
  type TrailRuntimeStore,
} from "./trail-runtime";
import type { TrailSourceIssue } from "./trail-source-issue";
import {
  TriageMarkdownMutationError,
  type TrailTriageContribution,
  type TrailTriageParseResult,
} from "./trail-triage-markdown";
import type { TrailTriagePersistence } from "./trail-triage-persistence";
import {
  toTrailMutationPlan as toTriageMutationPlan,
  type DeleteTriageIssuePlan,
} from "./trail-triage-plan";
import { supportsWorkflowIssueDeletion } from "./trail-workflow-issue-deletion-persistence";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import {
  toTrailMutationPlan as toWorkflowMutationPlan,
  type CreateWorkflowIssuePlan,
} from "./trail-workflow-plan";
import { validateProjectContribution } from "./trail-workflow-validation";

export interface TriageAcceptReceipt {
  readonly completion: Promise<void>;
  readonly sourceIssueId: string;
  readonly targetIssueId: string;
}

export interface TriageAcceptCommandEnvironment {
  readonly createId: () => string;
  readonly now: () => number;
}

export type TriageAcceptErrorCode =
  | "compensated"
  | "conflict"
  | "partial"
  | "persistence-failed"
  | "planning-rejected"
  | "source-invalid"
  | "verification-failed";

export class TriageAcceptError extends Error {
  public constructor(
    readonly code: TriageAcceptErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TriageAcceptError";
  }
}

interface AcceptTriageCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly kind: "triage.accept";
  readonly projectId: string;
  readonly sourceIssueId: string;
  readonly targetIssueId: string;
}

export interface TriageAcceptPlan {
  readonly commandId: string;
  readonly kind: "accept-triage-issue";
  readonly sourceDelete: DeleteTriageIssuePlan;
  readonly targetCreate: CreateWorkflowIssuePlan;
}

export type TriageAcceptPlanResult =
  | { readonly kind: "ready"; readonly plan: TriageAcceptPlan }
  | { readonly kind: "rejected"; readonly reason: string };

type AcceptOutcome = "committed" | "compensated" | "partial" | "unchanged";

function normalizeId(id: string, label: string): string {
  const normalized = id.trim();
  if (normalized === "") {
    throw new TriageAcceptError(
      "planning-rejected",
      `${label} must be non-empty text`,
    );
  }
  return normalized;
}

function normalizeEffectiveAt(environment: TriageAcceptCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new TriageAcceptError(
      "planning-rejected",
      "Triage Accept effective timestamp is invalid",
    );
  }
  return effectiveAt;
}

export function normalizeAcceptTriageCommand(
  expectedIssue: TrailTriageIssue,
  projectId: string,
  environment: TriageAcceptCommandEnvironment,
): AcceptTriageCommand {
  return {
    commandId: normalizeId(environment.createId(), "Command ID"),
    effectiveAt: normalizeEffectiveAt(environment),
    expectedIssue,
    kind: "triage.accept",
    projectId: normalizeId(projectId, "Project ID"),
    sourceIssueId: normalizeId(expectedIssue.id, "Triage Issue ID"),
    targetIssueId: normalizeId(environment.createId(), "Workflow Issue ID"),
  };
}

/** Plans one logical Accept as a new Workflow identity plus source removal. */
export function planAcceptTriageIssue(
  command: AcceptTriageCommand,
  configuration: TrailConfiguration,
  currentSource: TrailTriageIssue | undefined,
  currentProject: TrailProject | undefined,
  existingEntityIds: ReadonlySet<string>,
): TriageAcceptPlanResult {
  if (currentSource === undefined) {
    return {
      kind: "rejected",
      reason: `Triage Issue does not exist: ${command.sourceIssueId}`,
    };
  }
  if (!sameTrailTriageIssue(currentSource, command.expectedIssue)) {
    return {
      kind: "rejected",
      reason: `Triage Issue changed before Accept: ${command.sourceIssueId}`,
    };
  }
  if (currentProject === undefined) {
    return {
      kind: "rejected",
      reason: `Project does not exist: ${command.projectId}`,
    };
  }
  if (existingEntityIds.has(command.targetIssueId)) {
    return {
      kind: "rejected",
      reason: `Trail entity ID already exists: ${command.targetIssueId}`,
    };
  }

  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    currentProject.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return {
      kind: "rejected",
      reason: `Project status is invalid: ${currentProject.id}`,
    };
  }
  if (projectStatus.category === "completed" || projectStatus.category === "canceled") {
    return {
      kind: "rejected",
      reason: "A terminal Project must be reopened before accepting non-terminal work",
    };
  }

  const backlog = resolveDefaultStatusDefinition(
    configuration.statuses.issue,
    "backlog",
  );
  const targetIssue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    description: currentSource.description,
    estimate: currentSource.estimate,
    id: command.targetIssueId,
    labelIds: [...currentSource.labelIds],
    priority: currentSource.priority,
    projectId: currentProject.id,
    statusDefinitionId: backlog.id,
    title: currentSource.title,
  };

  return {
    kind: "ready",
    plan: {
      commandId: command.commandId,
      kind: "accept-triage-issue",
      sourceDelete: {
        commandId: command.commandId,
        expectedIssue: currentSource,
        issueId: currentSource.id,
        kind: "delete-triage-issue",
      },
      targetCreate: {
        commandId: command.commandId,
        expectedProject: currentProject,
        issue: targetIssue,
        kind: "create-workflow-issue",
      },
    },
  };
}

function errorCategory(error: unknown): string {
  if (error instanceof TriageAcceptError) return error.code;
  if (error instanceof TriageMarkdownMutationError) return error.code;
  if (error instanceof ProjectMarkdownMutationError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown-error";
}

function partialIssue(filePath: string, objectId: string): TrailSourceIssue {
  return {
    code: "triage-accept.partial",
    filePath,
    message:
      "Triage Accept reached a partial cross-source state. Review the source and target before retrying.",
    objectId,
    scope: "record",
  };
}

/**
 * Executes Triage Accept as one optimistic logical mutation. Destination creation
 * is verified before source deletion; source-delete failure compensates the target
 * when it can do so safely, otherwise the runtime exposes an explicit partial state.
 */
export class TrailTriageAcceptService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly triagePersistence: TrailTriagePersistence,
    private readonly workflowPersistence: TrailWorkflowPersistence,
    private readonly configuration: TrailConfiguration,
    private readonly commandEnvironment: TriageAcceptCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public accept(
    expectedIssue: TrailTriageIssue,
    projectId: string,
  ): TriageAcceptReceipt {
    const command = normalizeAcceptTriageCommand(
      expectedIssue,
      projectId,
      this.commandEnvironment,
    );
    const state = this.runtimeStore.getState();
    const result = planAcceptTriageIssue(
      command,
      this.configuration,
      selectEffectiveTriageIssueById(state, expectedIssue.id),
      selectEffectiveProjectById(state, projectId),
      selectEffectiveEntityIdSet(state),
    );

    this.diagnostics.record("command.created", {
      correlationId: command.commandId,
      data: {
        effectiveAt: command.effectiveAt,
        kind: command.kind,
        projectId: command.projectId,
        sourceIssueId: command.sourceIssueId,
        targetIssueId: command.targetIssueId,
      },
    });

    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId: command.commandId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new TriageAcceptError("planning-rejected", result.reason);
    }

    const plan = result.plan;
    this.diagnostics.record("command.planned", {
      correlationId: command.commandId,
      data: {
        kind: command.kind,
        planKind: plan.kind,
        projectId: plan.targetCreate.expectedProject.id,
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
    });
    const logicalPlan = this.addOptimisticPlan(plan);
    this.diagnostics.record("runtime.optimistic.applied", {
      correlationId: command.commandId,
      data: {
        pendingCount: this.runtimeStore.getState().pendingPlans.length,
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
    });

    const completion = this.mutationQueue.enqueue(
      () => this.executePersistedAccept(plan, logicalPlan, command.commandId),
      { correlationId: command.commandId, kind: command.kind },
    );
    return {
      completion,
      sourceIssueId: plan.sourceDelete.issueId,
      targetIssueId: plan.targetCreate.issue.id,
    };
  }

  private addOptimisticPlan(plan: TriageAcceptPlan): TrailMutationPlan {
    const logicalPlan = mergeTrailMutationPlans({
      commandId: plan.commandId,
      intent: "triage.accept",
      plans: [
        toTriageMutationPlan(plan.sourceDelete),
        toWorkflowMutationPlan(plan.targetCreate),
      ],
    });
    // Both logical effects publish in one store update; no view observes a half-Accept.
    addPendingPlan(this.runtimeStore, logicalPlan);
    return logicalPlan;
  }

  private async executePersistedAccept(
    plan: TriageAcceptPlan,
    logicalPlan: TrailMutationPlan,
    correlationId: string,
  ): Promise<void> {
    let physicalPlan: TrailSourceTransitionPlan;
    try {
      physicalPlan = await materializeTrailSourceTransitionPlan(
        logicalPlan,
        this.runtimeStore.getState().committed,
      );
    } catch (error: unknown) {
      removePendingPlan(this.runtimeStore, plan.commandId);
      this.diagnostics.record("runtime.optimistic.removed", {
        correlationId,
        data: {
          pendingCount: this.runtimeStore.getState().pendingPlans.length,
          reason: "failed",
        },
        level: "warn",
      });
      this.diagnostics.record("command.failed", {
        correlationId,
        data: {
          category: errorCategory(error),
          kind: "triage.accept",
          sourceIssueId: plan.sourceDelete.issueId,
          targetIssueId: plan.targetCreate.issue.id,
        },
        level: "error",
      });
      throw this.mapError(error);
    }

    const compensationDriver = supportsWorkflowIssueDeletion(this.workflowPersistence)
      ? {
          compensateTarget: (compensationPlan: TrailSingleTransactionPlan) =>
            this.executeCompensation(plan, compensationPlan, correlationId),
        }
      : {};

    const outcome = await executeTrailSourceTransition<
      TrailProjectContribution,
      TrailTriageContribution
    >(physicalPlan, {
      ...compensationDriver,
      executeSource: (sourcePlan) =>
        this.executeSourceDelete(plan, sourcePlan, correlationId),
      executeTarget: (targetPlan) =>
        this.executeTargetCreate(plan, targetPlan, correlationId),
      observeSource: () => this.observeSource(plan),
      observeTarget: () =>
        this.observeTarget(plan, physicalPlan.target.sourcePath),
      preflight: async (transitionPlan) => {
        await this.verifySourcePrecondition(plan, correlationId);
        this.assertTargetSourceValid(transitionPlan.target.sourcePath);
      },
    });

    await this.finishTransitionOutcome(
      plan,
      physicalPlan.target.sourcePath,
      outcome,
      correlationId,
    );
  }

  private async executeTargetCreate(
    plan: TriageAcceptPlan,
    targetPlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailProjectContribution> {
    this.diagnostics.record("triage.accept.target-write.started", {
      correlationId,
      data: {
        projectId: plan.targetCreate.expectedProject.id,
        targetIssueId: plan.targetCreate.issue.id,
        targetPath: targetPlan.sourcePath,
      },
    });

    const executed = await executeTrailSingleTransaction(
      targetPlan,
      { workflow: this.workflowPersistence },
      correlationId,
    );
    if (executed.kind !== "project-source") {
      throw new TriageAcceptError(
        "verification-failed",
        "Triage Accept target did not execute against a Project source",
      );
    }
    const contribution = this.verifyTargetResult(
      plan,
      executed.result,
      correlationId,
    );
    this.diagnostics.record("triage.accept.target-write.completed", {
      correlationId,
      data: {
        projectId: contribution.project.id,
        targetIssueId: plan.targetCreate.issue.id,
        targetPath: contribution.filePath,
      },
    });
    return contribution;
  }

  private async executeSourceDelete(
    plan: TriageAcceptPlan,
    sourcePlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailTriageContribution> {
    this.diagnostics.record("triage.accept.source-delete.started", {
      correlationId,
      data: {
        sourceIssueId: plan.sourceDelete.issueId,
        sourcePath: sourcePlan.sourcePath,
      },
    });
    const executed = await executeTrailSingleTransaction(
      sourcePlan,
      { triageManage: this.triagePersistence },
      correlationId,
    );
    if (executed.kind !== "triage-source") {
      throw new TriageAcceptError(
        "verification-failed",
        "Triage Accept source delete did not execute against Triage",
      );
    }
    return this.verifySourceDeleted(plan, executed.result, correlationId);
  }

  private async executeCompensation(
    plan: TriageAcceptPlan,
    compensationPlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailProjectContribution> {
    if (!supportsWorkflowIssueDeletion(this.workflowPersistence)) {
      throw new Error("Workflow target deletion is unavailable for compensation");
    }
    this.diagnostics.record("triage.accept.compensation.started", {
      correlationId,
      data: {
        targetIssueId: plan.targetCreate.issue.id,
        targetPath: compensationPlan.sourcePath,
      },
      level: "warn",
    });
    const executed = await executeTrailSingleTransaction(
      compensationPlan,
      { workflow: this.workflowPersistence },
      correlationId,
    );
    if (executed.kind !== "project-source") {
      throw new TriageAcceptError(
        "verification-failed",
        "Triage Accept compensation did not execute against a Project source",
      );
    }
    return this.verifyCompensationResult(plan, executed.result);
  }

  private async observeTarget(
    plan: TriageAcceptPlan,
    targetPath: string,
  ): Promise<TrailTransitionObservation<TrailProjectContribution>> {
    const latest = await this.safeReadTarget(targetPath);
    if (
      latest === undefined
      || latest.issues.length > 0
      || latest.contribution === undefined
    ) {
      return { kind: "unsafe" };
    }
    const domainIssues = validateProjectContribution(
      latest.contribution,
      this.configuration,
    );
    if (domainIssues.length > 0) {
      return { kind: "unsafe" };
    }
    const persisted = latest.contribution.issuesById[plan.targetCreate.issue.id];
    if (persisted === undefined) {
      return { kind: "absent", value: latest.contribution };
    }
    if (sameTrailWorkflowIssue(persisted, plan.targetCreate.issue)) {
      return { kind: "present", value: latest.contribution };
    }
    return { kind: "unsafe" };
  }

  private async observeSource(
    plan: TriageAcceptPlan,
  ): Promise<TrailTransitionObservation<TrailTriageContribution>> {
    const latest = await this.safeReadSource();
    if (latest === undefined || latest.issues.length > 0) {
      return { kind: "unsafe" };
    }
    if (latest.contribution.issuesById[plan.sourceDelete.issueId] === undefined) {
      return { kind: "absent", value: latest.contribution };
    }
    // Any physically valid surviving source makes removal of the just-created
    // target safe; the source itself is authoritative even if externally edited.
    return { kind: "present", value: latest.contribution };
  }

  private async finishTransitionOutcome(
    plan: TriageAcceptPlan,
    targetPath: string,
    outcome: TrailSourceTransitionOutcome<
      TrailProjectContribution,
      TrailTriageContribution
    >,
    correlationId: string,
  ): Promise<void> {
    switch (outcome.kind) {
      case "committed":
        this.reconcileTarget(
          outcome.target,
          outcome.recovered ? "triage.accept-recovered" : "triage.accept",
          correlationId,
        );
        this.reconcileSource(
          outcome.source,
          outcome.recovered ? "triage.accept-recovered" : "triage.accept",
          correlationId,
        );
        if (outcome.recovered) {
          this.diagnostics.record("triage.accept.source-delete.recovered", {
            correlationId,
            data: { sourceIssueId: plan.sourceDelete.issueId },
            level: "warn",
          });
        }
        this.finishCommitted(plan, correlationId);
        return;
      case "unchanged":
        await this.finishFailed(plan, targetPath, outcome.error, correlationId);
        this.recordOutcome(plan, "unchanged", correlationId);
        throw this.mapError(outcome.error);
      case "compensated": {
        this.reconcileTarget(
          outcome.target,
          outcome.recovered
            ? "triage.accept-compensated-recovered"
            : "triage.accept-compensated",
          correlationId,
        );
        let source = outcome.source;
        if (source === undefined) {
          const latestSource = await this.safeReadSource();
          if (latestSource !== undefined && latestSource.issues.length === 0) {
            source = latestSource.contribution;
          }
        }
        if (source !== undefined) {
          this.reconcileSource(
            source,
            outcome.recovered
              ? "triage.accept-compensated-recovered"
              : "triage.accept-compensated",
            correlationId,
          );
        }
        removePendingPlan(this.runtimeStore, plan.commandId);
        this.diagnostics.record("runtime.optimistic.removed", {
          correlationId,
          data: {
            pendingCount: this.runtimeStore.getState().pendingPlans.length,
            reason: "compensated",
          },
          level: "warn",
        });
        this.diagnostics.record("triage.accept.compensation.completed", {
          correlationId,
          data: {
            recovered: outcome.recovered,
            targetIssueId: plan.targetCreate.issue.id,
            targetPath,
          },
          level: "warn",
        });
        this.recordOutcome(plan, "compensated", correlationId);
        throw new TriageAcceptError(
          "compensated",
          "Triage Accept could not remove the source, so the new Workflow target was rolled back safely.",
          outcome.error,
        );
      }
      case "partial":
        return this.markPartial(plan, targetPath, outcome.error, correlationId);
    }
  }

  private assertTargetSourceValid(targetPath: string): void {
    const state = this.runtimeStore.getState();
    const rootIssues = selectSourceIssuesForPath(state, TRAIL_PROJECTS_PATH);
    const targetIssues = selectSourceIssuesForPath(state, targetPath);
    if (rootIssues.length > 0 || targetIssues.length > 0) {
      throw new TriageAcceptError(
        "source-invalid",
        "Target Workflow source is invalid; review the Markdown before Accept",
      );
    }
  }

  private async verifySourcePrecondition(
    plan: TriageAcceptPlan,
    correlationId: string,
  ): Promise<void> {
    const latest = await this.triagePersistence.readLatest();
    if (latest.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, latest.issues);
      throw new TriageAcceptError(
        "source-invalid",
        "Triage source is invalid; review Triage.md before Accept",
      );
    }
    const current = latest.contribution.issuesById[plan.sourceDelete.issueId];
    if (
      current === undefined
      || !sameTrailTriageIssue(current, plan.sourceDelete.expectedIssue)
    ) {
      this.reconcileSource(latest.contribution, "triage.accept-preflight", correlationId);
      throw new TriageAcceptError(
        "conflict",
        "Triage Issue changed before Accept; review the latest source before retrying",
      );
    }
    this.diagnostics.record("triage.accept.preflight.completed", {
      correlationId,
      data: {
        sourceIssueId: current.id,
        sourcePath: TRAIL_TRIAGE_PATH,
      },
    });
  }

  private verifyTargetResult(
    plan: TriageAcceptPlan,
    result: TrailProjectParseResult,
    correlationId: string,
  ): TrailProjectContribution {
    const targetPath = result.contribution?.filePath ?? result.issues[0]?.filePath;
    if (result.issues.length > 0 || result.contribution === undefined) {
      if (targetPath !== undefined) {
        setSourceIssuesForPath(this.runtimeStore, targetPath, result.issues);
      }
      throw new TriageAcceptError(
        "verification-failed",
        "Accepted Workflow target failed physical validation",
      );
    }
    const domainIssues = validateProjectContribution(result.contribution, this.configuration);
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(this.runtimeStore, result.contribution.filePath, domainIssues);
      throw new TriageAcceptError(
        "verification-failed",
        "Accepted Workflow target failed Domain validation",
      );
    }
    const persisted = result.contribution.issuesById[plan.targetCreate.issue.id];
    if (
      persisted === undefined
      || !sameTrailWorkflowIssue(persisted, plan.targetCreate.issue)
    ) {
      throw new TriageAcceptError(
        "verification-failed",
        "Accepted Workflow target did not match the planned Issue",
      );
    }
    this.diagnostics.record("triage.accept.target-validation.completed", {
      correlationId,
      data: {
        projectId: result.contribution.project.id,
        targetIssueId: persisted.id,
        targetPath: result.contribution.filePath,
      },
    });
    return result.contribution;
  }

  private verifySourceDeleted(
    plan: TriageAcceptPlan,
    result: TrailTriageParseResult,
    correlationId: string,
  ): TrailTriageContribution {
    if (result.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, result.issues);
      throw new TriageAcceptError(
        "verification-failed",
        "Triage source failed validation after Accept deletion",
      );
    }
    if (result.contribution.issuesById[plan.sourceDelete.issueId] !== undefined) {
      throw new TriageAcceptError(
        "verification-failed",
        "Triage source still contains the accepted Issue",
      );
    }
    this.diagnostics.record("triage.accept.source-delete.completed", {
      correlationId,
      data: {
        sourceIssueId: plan.sourceDelete.issueId,
        sourcePath: TRAIL_TRIAGE_PATH,
      },
    });
    return result.contribution;
  }

  private verifyCompensationResult(
    plan: TriageAcceptPlan,
    result: TrailProjectParseResult,
  ): TrailProjectContribution {
    if (result.issues.length > 0 || result.contribution === undefined) {
      throw new TriageAcceptError(
        "verification-failed",
        "Compensation left the Workflow target source invalid",
      );
    }
    const domainIssues = validateProjectContribution(result.contribution, this.configuration);
    if (domainIssues.length > 0) {
      throw new TriageAcceptError(
        "verification-failed",
        "Compensation left the Workflow target Domain-invalid",
      );
    }
    if (result.contribution.issuesById[plan.targetCreate.issue.id] !== undefined) {
      throw new TriageAcceptError(
        "verification-failed",
        "Compensation did not remove the accepted Workflow Issue",
      );
    }
    return result.contribution;
  }

  private async markPartial(
    plan: TriageAcceptPlan,
    targetPath: string,
    error: unknown,
    correlationId: string,
  ): Promise<never> {
    await this.bestEffortReconcile(targetPath, correlationId);
    const sourceExisting = selectSourceIssuesForPath(
      this.runtimeStore.getState(),
      TRAIL_TRIAGE_PATH,
    );
    setSourceIssuesForPath(this.runtimeStore, TRAIL_TRIAGE_PATH, [
      ...sourceExisting,
      partialIssue(TRAIL_TRIAGE_PATH, plan.sourceDelete.issueId),
    ]);
    const targetExisting = selectSourceIssuesForPath(
      this.runtimeStore.getState(),
      targetPath,
    );
    setSourceIssuesForPath(this.runtimeStore, targetPath, [
      ...targetExisting,
      partialIssue(targetPath, plan.targetCreate.issue.id),
    ]);
    removePendingPlan(this.runtimeStore, plan.commandId);
    this.diagnostics.record("runtime.optimistic.removed", {
      correlationId,
      data: {
        pendingCount: this.runtimeStore.getState().pendingPlans.length,
        reason: "partial",
      },
      level: "error",
    });
    this.diagnostics.record("command.failed", {
      correlationId,
      data: {
        category: "partial",
        kind: "triage.accept",
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
      level: "error",
    });
    this.recordOutcome(plan, "partial", correlationId);
    throw new TriageAcceptError(
      "partial",
      "Triage Accept reached a partial cross-source state. Review the Data Issues before retrying.",
      error,
    );
  }

  private async finishFailed(
    plan: TriageAcceptPlan,
    targetPath: string,
    error: unknown,
    correlationId: string,
  ): Promise<void> {
    await this.bestEffortReconcile(targetPath, correlationId);
    removePendingPlan(this.runtimeStore, plan.commandId);
    this.diagnostics.record("runtime.optimistic.removed", {
      correlationId,
      data: {
        pendingCount: this.runtimeStore.getState().pendingPlans.length,
        reason: "failed",
      },
      level: "warn",
    });
    this.diagnostics.record("command.failed", {
      correlationId,
      data: {
        category: errorCategory(error),
        kind: "triage.accept",
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
      level: "error",
    });
  }

  private finishCommitted(plan: TriageAcceptPlan, correlationId: string): void {
    removePendingPlan(this.runtimeStore, plan.commandId);
    this.diagnostics.record("runtime.optimistic.removed", {
      correlationId,
      data: {
        pendingCount: this.runtimeStore.getState().pendingPlans.length,
        reason: "committed",
      },
    });
    this.diagnostics.record("command.committed", {
      correlationId,
      data: {
        kind: "triage.accept",
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
    });
    this.recordOutcome(plan, "committed", correlationId);
  }

  private recordOutcome(
    plan: TriageAcceptPlan,
    outcome: AcceptOutcome,
    correlationId: string,
  ): void {
    this.diagnostics.record("triage.accept.outcome", {
      correlationId,
      data: {
        outcome,
        sourceIssueId: plan.sourceDelete.issueId,
        targetIssueId: plan.targetCreate.issue.id,
      },
      level: outcome === "committed" || outcome === "unchanged" ? "info" : "warn",
    });
  }

  private reconcileTarget(
    contribution: TrailProjectContribution,
    reason: string,
    correlationId: string,
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

  private reconcileSource(
    contribution: TrailTriageContribution,
    reason: string,
    correlationId: string,
  ): void {
    const result = reconcileTriageContribution(this.runtimeStore, contribution);
    this.diagnostics.record("runtime.triage.reconciled", {
      correlationId,
      data: {
        addedIds: result.diff.addedIds,
        changedFieldsById: result.diff.changedFieldsById,
        changedIds: result.diff.changedIds,
        committedRevision: result.revision,
        reason,
        removedIds: result.diff.removedIds,
        triageCount: result.triageCount,
      },
    });
  }

  private async reconcileTargetFromPersistence(
    targetPath: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    const latest = await this.safeReadTarget(targetPath);
    if (latest === undefined) return;
    if (latest.issues.length > 0 || latest.contribution === undefined) {
      setSourceIssuesForPath(this.runtimeStore, targetPath, latest.issues);
      return;
    }
    const domainIssues = validateProjectContribution(latest.contribution, this.configuration);
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(this.runtimeStore, targetPath, domainIssues);
      return;
    }
    this.reconcileTarget(latest.contribution, reason, correlationId);
  }

  private async bestEffortReconcile(
    targetPath: string,
    correlationId: string,
  ): Promise<void> {
    const source = await this.safeReadSource();
    if (source !== undefined) {
      if (source.issues.length === 0) {
        this.reconcileSource(source.contribution, "triage.accept-failure", correlationId);
      } else {
        setTriageSourceIssues(this.runtimeStore, source.issues);
      }
    }
    await this.reconcileTargetFromPersistence(
      targetPath,
      "triage.accept-failure",
      correlationId,
    );
  }

  private async safeReadSource(): Promise<TrailTriageParseResult | undefined> {
    try {
      return await this.triagePersistence.readLatest();
    } catch {
      return undefined;
    }
  }

  private async safeReadTarget(
    targetPath: string,
  ): Promise<TrailProjectParseResult | undefined> {
    try {
      return await this.workflowPersistence.readSource(targetPath);
    } catch {
      return undefined;
    }
  }

  private mapError(error: unknown): TriageAcceptError {
    if (error instanceof TriageAcceptError) return error;
    if (error instanceof TriageMarkdownMutationError) {
      const code = error.code === "conflict" || error.code === "target-missing"
        ? "conflict"
        : error.code === "source-invalid"
          ? "source-invalid"
          : "verification-failed";
      return new TriageAcceptError(code, error.message, error);
    }
    if (error instanceof ProjectMarkdownMutationError) {
      const code = error.code === "conflict"
        || error.code === "target-missing"
        || error.code === "duplicate-id"
          ? "conflict"
          : error.code === "source-invalid"
            ? "source-invalid"
            : "verification-failed";
      return new TriageAcceptError(code, error.message, error);
    }
    return new TriageAcceptError(
      "persistence-failed",
      error instanceof Error ? error.message : "Triage Accept persistence failed",
      error,
    );
  }
}
