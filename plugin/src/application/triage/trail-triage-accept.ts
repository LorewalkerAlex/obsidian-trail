import type {
  TrailProjectSourceResult,
} from "../../persistence/domain-sources/trail-source-result";
import type {
  TrailProjectSourceSnapshot,
} from "../../persistence/domain-sources/trail-domain-source-snapshot";
import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import { submitTrailMutation } from "../../mutation/coordinator/trail-mutation-coordinator";
import {
  executeTrailSourceTransition,
  type TrailSourceTransitionOutcome,
  type TrailTransitionObservation,
} from "../../mutation/execution/trail-source-transition-executor";
import { executeTrailSingleTransaction } from "../../mutation/execution/trail-single-transaction-executor";
import { materializeTrailSourceTransitionPlan } from "../../mutation/physical/trail-source-transition-plan";
import type { TrailSingleTransactionPlan } from "../../mutation/physical/trail-single-transaction-plan";
import {
  createTrailMutationPlan,
  mergeTrailMutationPlans,
  projectMutationEntity,
  triageIssueMutationEntity,
  workflowIssueMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import {
  resolveDefaultStatusDefinition,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "../../domain/trail-configuration";
import {
  isTrailEpochMilliseconds,
  sameTrailTriageIssue,
  sameTrailWorkflowIssue,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import { TRAIL_PROJECTS_PATH, TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import type { TrailProject } from "../../domain/trail-project";

import {
  selectEffectiveEntityIdSet,
  selectEffectiveProjectById,
  selectEffectiveTriageIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import {
  reconcileProjectContribution,
  reconcileTriageContribution,
  setTriageSourceIssues,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import type { TrailSourceIssue } from "../../domain/trail-source-issue";
import {
  TriageMarkdownMutationError,
  type TrailTriageContribution,
  type TrailTriageParseResult,
} from "../../markdown/codecs/trail-triage-codec";
import type { TrailTriagePersistence } from "../../persistence/domain-sources/trail-triage-persistence";


import {
  type TrailWorkflowPersistence,
  TrailWorkflowPersistenceError,
} from "../../persistence/domain-sources/trail-workflow-persistence";

import { validateProjectContribution } from "../../domain/trail-workflow-validation";

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

export type TriageAcceptPlanResult =
  | {
      readonly kind: "ready";
      readonly plan: TrailMutationPlan;
      readonly sourceIssue: TrailTriageIssue;
      readonly targetIssue: TrailWorkflowIssue;
      readonly targetProject: TrailProject;
    }
  | { readonly kind: "rejected"; readonly reason: string };

interface TriageAcceptContext {
  readonly sourceDelete: {
    readonly expectedIssue: TrailTriageIssue;
    readonly issueId: string;
  };
  readonly targetCreate: {
    readonly expectedProject: TrailProject;
    readonly issue: TrailWorkflowIssue;
  };
}

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

  const sourceDelete = createTrailMutationPlan({
    commandId: command.commandId,
    effects: [{ before: triageIssueMutationEntity(currentSource), kind: "delete" }],
    intent: "triage.issue.delete",
  });
  const targetCreate = createTrailMutationPlan({
    commandId: command.commandId,
    effects: [{ after: workflowIssueMutationEntity(targetIssue), kind: "create" }],
    intent: "workflow.issue.create",
    preconditions: [{
      entity: projectMutationEntity(currentProject),
      kind: "entity-equals",
    }],
  });

  return {
    kind: "ready",
    plan: mergeTrailMutationPlans({
      commandId: command.commandId,
      intent: "triage.accept",
      plans: [sourceDelete, targetCreate],
    }),
    sourceIssue: currentSource,
    targetIssue,
    targetProject: currentProject,
  };
}

function errorCategory(error: unknown): string {
  if (error instanceof TriageAcceptError) return error.code;
  if (error instanceof TriageMarkdownMutationError) return error.code;
  if (error instanceof TrailWorkflowPersistenceError) return error.code;
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

    const context = {
      sourceDelete: {
        expectedIssue: result.sourceIssue,
        issueId: result.sourceIssue.id,
      },
      targetCreate: {
        expectedProject: result.targetProject,
        issue: result.targetIssue,
      },
    };
    this.diagnostics.record("command.planned", {
      correlationId: command.commandId,
      data: {
        kind: command.kind,
        intent: result.plan.intent,
        projectId: context.targetCreate.expectedProject.id,
        sourceIssueId: context.sourceDelete.issueId,
        targetIssueId: context.targetCreate.issue.id,
      },
    });
    const logicalPlan = result.plan;
    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: () =>
          this.executePersistedAccept(context, logicalPlan, command.commandId),
        mapError: (error) => this.mapError(error),
        onCommitted: () => this.finishCommitted(context, command.commandId),
        onFailed: (error) => {
          // Safe compensation is an expected cross-source recovery outcome rather
          // than an additional command-failed diagnostic.
          if (error instanceof TriageAcceptError && error.code === "compensated") {
            return;
          }
          this.recordCommandFailed(context, error, command.commandId);
        },
        optimisticData: {
          sourceIssueId: context.sourceDelete.issueId,
          targetIssueId: context.targetCreate.issue.id,
        },
        plan: logicalPlan,
        queueKind: command.kind,
        settle: () => undefined,
      },
      this.diagnostics,
    );
    return {
      completion,
      sourceIssueId: context.sourceDelete.issueId,
      targetIssueId: context.targetCreate.issue.id,
    };
  }

  private async executePersistedAccept(
    context: TriageAcceptContext,
    logicalPlan: TrailMutationPlan,
    correlationId: string,
  ): Promise<void> {
    const physicalPlan = await materializeTrailSourceTransitionPlan(
      logicalPlan,
      this.runtimeStore.getState().committed,
    );

    const outcome = await executeTrailSourceTransition<
      TrailProjectSourceSnapshot,
      TrailTriageContribution
    >(physicalPlan, {
      compensateTarget: (compensationPlan: TrailSingleTransactionPlan) =>
        this.executeCompensation(context, compensationPlan, correlationId),
      executeSource: (sourcePlan) =>
        this.executeSourceDelete(context, sourcePlan, correlationId),
      executeTarget: (targetPlan) =>
        this.executeTargetCreate(context, targetPlan, correlationId),
      observeSource: () => this.observeSource(context),
      observeTarget: () =>
        this.observeTarget(context, physicalPlan.target.sourcePath),
      preflight: async (transitionPlan) => {
        await this.verifySourcePrecondition(context, correlationId);
        this.assertTargetSourceValid(transitionPlan.target.sourcePath);
      },
    });

    await this.finishTransitionOutcome(
      context,
      physicalPlan.target.sourcePath,
      outcome,
      correlationId,
    );
  }

  private async executeTargetCreate(
    context: TriageAcceptContext,
    targetPlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailProjectSourceSnapshot> {
    this.diagnostics.record("triage.accept.target-write.started", {
      correlationId,
      data: {
        projectId: context.targetCreate.expectedProject.id,
        targetIssueId: context.targetCreate.issue.id,
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
      context,
      executed.result,
      correlationId,
    );
    this.diagnostics.record("triage.accept.target-write.completed", {
      correlationId,
      data: {
        projectId: contribution.project.id,
        targetIssueId: context.targetCreate.issue.id,
        targetPath: contribution.filePath,
      },
    });
    return contribution;
  }

  private async executeSourceDelete(
    context: TriageAcceptContext,
    sourcePlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailTriageContribution> {
    this.diagnostics.record("triage.accept.source-delete.started", {
      correlationId,
      data: {
        sourceIssueId: context.sourceDelete.issueId,
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
    return this.verifySourceDeleted(context, executed.result, correlationId);
  }

  private async executeCompensation(
    context: TriageAcceptContext,
    compensationPlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<TrailProjectSourceSnapshot> {
    this.diagnostics.record("triage.accept.compensation.started", {
      correlationId,
      data: {
        targetIssueId: context.targetCreate.issue.id,
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
    return this.verifyCompensationResult(context, executed.result);
  }

  private async observeTarget(
    context: TriageAcceptContext,
    targetPath: string,
  ): Promise<TrailTransitionObservation<TrailProjectSourceSnapshot>> {
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
    const persisted = latest.contribution.issuesById[context.targetCreate.issue.id];
    if (persisted === undefined) {
      return { kind: "absent", value: latest.contribution };
    }
    if (sameTrailWorkflowIssue(persisted, context.targetCreate.issue)) {
      return { kind: "present", value: latest.contribution };
    }
    return { kind: "unsafe" };
  }

  private async observeSource(
    context: TriageAcceptContext,
  ): Promise<TrailTransitionObservation<TrailTriageContribution>> {
    const latest = await this.safeReadSource();
    if (latest === undefined || latest.issues.length > 0) {
      return { kind: "unsafe" };
    }
    if (latest.contribution.issuesById[context.sourceDelete.issueId] === undefined) {
      return { kind: "absent", value: latest.contribution };
    }
    // Any physically valid surviving source makes removal of the just-created
    // target safe; the source itself is authoritative even if externally edited.
    return { kind: "present", value: latest.contribution };
  }

  private async finishTransitionOutcome(
    context: TriageAcceptContext,
    targetPath: string,
    outcome: TrailSourceTransitionOutcome<
      TrailProjectSourceSnapshot,
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
            data: { sourceIssueId: context.sourceDelete.issueId },
            level: "warn",
          });
        }
        return;
      case "unchanged":
        await this.finishFailed(targetPath, correlationId);
        this.recordOutcome(context, "unchanged", correlationId);
        throw outcome.error;
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
        this.diagnostics.record("triage.accept.compensation.completed", {
          correlationId,
          data: {
            recovered: outcome.recovered,
            targetIssueId: context.targetCreate.issue.id,
            targetPath,
          },
          level: "warn",
        });
        this.recordOutcome(context, "compensated", correlationId);
        throw new TriageAcceptError(
          "compensated",
          "Triage Accept could not remove the source, so the new Workflow target was rolled back safely.",
          outcome.error,
        );
      }
      case "partial":
        return this.markPartial(context, targetPath, outcome.error, correlationId);
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
    context: TriageAcceptContext,
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
    const current = latest.contribution.issuesById[context.sourceDelete.issueId];
    if (
      current === undefined
      || !sameTrailTriageIssue(current, context.sourceDelete.expectedIssue)
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
    context: TriageAcceptContext,
    result: TrailProjectSourceResult,
    correlationId: string,
  ): TrailProjectSourceSnapshot {
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
    const persisted = result.contribution.issuesById[context.targetCreate.issue.id];
    if (
      persisted === undefined
      || !sameTrailWorkflowIssue(persisted, context.targetCreate.issue)
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
    context: TriageAcceptContext,
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
    if (result.contribution.issuesById[context.sourceDelete.issueId] !== undefined) {
      throw new TriageAcceptError(
        "verification-failed",
        "Triage source still contains the accepted Issue",
      );
    }
    this.diagnostics.record("triage.accept.source-delete.completed", {
      correlationId,
      data: {
        sourceIssueId: context.sourceDelete.issueId,
        sourcePath: TRAIL_TRIAGE_PATH,
      },
    });
    return result.contribution;
  }

  private verifyCompensationResult(
    context: TriageAcceptContext,
    result: TrailProjectSourceResult,
  ): TrailProjectSourceSnapshot {
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
    if (result.contribution.issuesById[context.targetCreate.issue.id] !== undefined) {
      throw new TriageAcceptError(
        "verification-failed",
        "Compensation did not remove the accepted Workflow Issue",
      );
    }
    return result.contribution;
  }

  private async markPartial(
    context: TriageAcceptContext,
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
      partialIssue(TRAIL_TRIAGE_PATH, context.sourceDelete.issueId),
    ]);
    const targetExisting = selectSourceIssuesForPath(
      this.runtimeStore.getState(),
      targetPath,
    );
    setSourceIssuesForPath(this.runtimeStore, targetPath, [
      ...targetExisting,
      partialIssue(targetPath, context.targetCreate.issue.id),
    ]);
    this.recordOutcome(context, "partial", correlationId);
    throw new TriageAcceptError(
      "partial",
      "Triage Accept reached a partial cross-source state. Review the Data Issues before retrying.",
      error,
    );
  }

  private async finishFailed(
    targetPath: string,
    correlationId: string,
  ): Promise<void> {
    await this.bestEffortReconcile(targetPath, correlationId);
  }

  private finishCommitted(context: TriageAcceptContext, correlationId: string): void {
    this.diagnostics.record("command.committed", {
      correlationId,
      data: {
        kind: "triage.accept",
        sourceIssueId: context.sourceDelete.issueId,
        targetIssueId: context.targetCreate.issue.id,
      },
    });
    this.recordOutcome(context, "committed", correlationId);
  }

  private recordCommandFailed(
    context: TriageAcceptContext,
    error: unknown,
    correlationId: string,
  ): void {
    this.diagnostics.record("command.failed", {
      correlationId,
      data: {
        category: errorCategory(error),
        kind: "triage.accept",
        sourceIssueId: context.sourceDelete.issueId,
        targetIssueId: context.targetCreate.issue.id,
      },
      level: "error",
    });
  }

  private recordOutcome(
    context: TriageAcceptContext,
    outcome: AcceptOutcome,
    correlationId: string,
  ): void {
    this.diagnostics.record("triage.accept.outcome", {
      correlationId,
      data: {
        outcome,
        sourceIssueId: context.sourceDelete.issueId,
        targetIssueId: context.targetCreate.issue.id,
      },
      level: outcome === "committed" || outcome === "unchanged" ? "info" : "warn",
    });
  }

  private reconcileTarget(
    contribution: TrailProjectSourceSnapshot,
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
  ): Promise<TrailProjectSourceResult | undefined> {
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
    if (error instanceof TrailWorkflowPersistenceError) {
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
