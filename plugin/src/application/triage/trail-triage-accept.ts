import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  resolveDefaultStatusDefinition,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "../../domain/trail-configuration";
import {
  sameTrailTriageIssue,
  type TrailTriageIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import { submitTrailMutation } from "../../mutation/coordinator/trail-mutation-coordinator";
import {
  executeTrailSourceTransition,
  type TrailSourceTransitionOutcome,
} from "../../mutation/execution/trail-source-transition-executor";
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
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import {
  selectEffectiveEntityIdSet,
  selectEffectiveProjectById,
  selectEffectiveTriageIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  TrailProjectSourceMutationError,
  type TrailProjectSourceSync,
} from "../../source-sync/projects/trail-project-source-sync";
import {
  TrailTriageSourceMutationError,
  type TrailTriageSourceSync,
} from "../../source-sync/triage/trail-triage-source-sync";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  TrailCommandValidationError,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface TriageAcceptReceipt {
  readonly completion: Promise<void>;
  readonly sourceIssueId: string;
  readonly targetIssueId: string;
}

export type TriageAcceptCommandEnvironment = TrailCommandEnvironment;

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
type ProjectTransitionSnapshot = Awaited<
  ReturnType<TrailProjectSourceSync["executeTransitionPlan"]>
>;
type TriageTransitionSnapshot = Awaited<
  ReturnType<TrailTriageSourceSync["executeTransitionPlan"]>
>;

export function normalizeAcceptTriageCommand(
  expectedIssue: TrailTriageIssue,
  projectId: string,
  environment: TriageAcceptCommandEnvironment,
): AcceptTriageCommand {
  try {
    return {
      commandId: normalizeTrailCommandId(environment.createId(), "Command ID"),
      effectiveAt: normalizeTrailCommandTime(environment),
      expectedIssue,
      kind: "triage.accept",
      projectId: normalizeTrailCommandId(projectId, "Project ID"),
      sourceIssueId: normalizeTrailCommandId(expectedIssue.id, "Triage Issue ID"),
      targetIssueId: normalizeTrailCommandId(
        environment.createId(),
        "Workflow Issue ID",
      ),
    };
  } catch (error: unknown) {
    if (error instanceof TrailCommandValidationError) {
      throw new TriageAcceptError("planning-rejected", error.message, error);
    }
    throw error;
  }
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
  if (error instanceof TrailTriageSourceMutationError) return error.code;
  if (error instanceof TrailProjectSourceMutationError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown-error";
}

function partialIssue(filePath: string, objectId: string) {
  return {
    code: "triage-accept.partial",
    filePath,
    message:
      "Triage Accept reached a partial cross-source state. Review the source and target before retrying.",
    objectId,
    scope: "record" as const,
  };
}

/**
 * Owns the Accept business transition while Source Sync owns authoritative source
 * reads, writes, verification, health, and Runtime reconciliation.
 */
export class TrailTriageAcceptService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly triageSources: TrailTriageSourceSync,
    private readonly workflowSources: TrailProjectSourceSync,
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

    const context: TriageAcceptContext = {
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

    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: () =>
          this.executePersistedAccept(context, result.plan, command.commandId),
        mapError: (error) => this.mapError(error),
        onCommitted: () => this.finishCommitted(context, command.commandId),
        onFailed: (error) => {
          if (error instanceof TriageAcceptError && error.code === "compensated") {
            return;
          }
          this.recordCommandFailed(context, error, command.commandId);
        },
        optimisticData: {
          sourceIssueId: context.sourceDelete.issueId,
          targetIssueId: context.targetCreate.issue.id,
        },
        plan: result.plan,
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
      ProjectTransitionSnapshot,
      TriageTransitionSnapshot
    >(physicalPlan, {
      compensateTarget: (compensationPlan) =>
        this.executeCompensation(context, compensationPlan, correlationId),
      executeSource: (sourcePlan) =>
        this.executeSourceDelete(context, sourcePlan, correlationId),
      executeTarget: (targetPlan) =>
        this.executeTargetCreate(context, targetPlan, correlationId),
      observeSource: (sourcePlan) =>
        this.triageSources.observeTransitionPlan(sourcePlan),
      observeTarget: (targetPlan) =>
        this.workflowSources.observeTransitionPlan(targetPlan),
      preflight: async (transitionPlan) => {
        await this.triageSources.preflightTransitionPlan(
          transitionPlan.source,
          correlationId,
        );
        this.workflowSources.assertTransitionSourceValid(
          transitionPlan.target.sourcePath,
        );
        this.diagnostics.record("triage.accept.preflight.completed", {
          correlationId,
          data: {
            sourceIssueId: context.sourceDelete.issueId,
            sourcePath: TRAIL_TRIAGE_PATH,
          },
        });
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
  ): Promise<ProjectTransitionSnapshot> {
    this.diagnostics.record("triage.accept.target-write.started", {
      correlationId,
      data: {
        projectId: context.targetCreate.expectedProject.id,
        targetIssueId: context.targetCreate.issue.id,
        targetPath: targetPlan.sourcePath,
      },
    });
    const contribution = await this.workflowSources.executeTransitionPlan(
      targetPlan,
      correlationId,
    );
    this.diagnostics.record("triage.accept.target-validation.completed", {
      correlationId,
      data: {
        projectId: contribution.project.id,
        targetIssueId: context.targetCreate.issue.id,
        targetPath: contribution.filePath,
      },
    });
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
  ): Promise<TriageTransitionSnapshot> {
    this.diagnostics.record("triage.accept.source-delete.started", {
      correlationId,
      data: {
        sourceIssueId: context.sourceDelete.issueId,
        sourcePath: sourcePlan.sourcePath,
      },
    });
    const contribution = await this.triageSources.executeTransitionPlan(
      sourcePlan,
      correlationId,
    );
    this.diagnostics.record("triage.accept.source-delete.completed", {
      correlationId,
      data: {
        sourceIssueId: context.sourceDelete.issueId,
        sourcePath: contribution.filePath,
      },
    });
    return contribution;
  }

  private async executeCompensation(
    context: TriageAcceptContext,
    compensationPlan: TrailSingleTransactionPlan,
    correlationId: string,
  ): Promise<ProjectTransitionSnapshot> {
    this.diagnostics.record("triage.accept.compensation.started", {
      correlationId,
      data: {
        targetIssueId: context.targetCreate.issue.id,
        targetPath: compensationPlan.sourcePath,
      },
      level: "warn",
    });
    return this.workflowSources.executeTransitionPlan(
      compensationPlan,
      correlationId,
    );
  }

  private async finishTransitionOutcome(
    context: TriageAcceptContext,
    targetPath: string,
    outcome: TrailSourceTransitionOutcome<
      ProjectTransitionSnapshot,
      TriageTransitionSnapshot
    >,
    correlationId: string,
  ): Promise<void> {
    switch (outcome.kind) {
      case "committed":
        this.workflowSources.reconcileTransitionSnapshot(
          outcome.target,
          outcome.recovered ? "triage.accept-recovered" : "triage.accept",
          correlationId,
        );
        this.triageSources.reconcileTransitionSnapshot(
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
        await this.bestEffortReconcile(targetPath, correlationId);
        this.recordOutcome(context, "unchanged", correlationId);
        throw outcome.error;
      case "compensated":
        this.workflowSources.reconcileTransitionSnapshot(
          outcome.target,
          outcome.recovered
            ? "triage.accept-compensated-recovered"
            : "triage.accept-compensated",
          correlationId,
        );
        if (outcome.source !== undefined) {
          this.triageSources.reconcileTransitionSnapshot(
            outcome.source,
            outcome.recovered
              ? "triage.accept-compensated-recovered"
              : "triage.accept-compensated",
            correlationId,
          );
        } else {
          await this.triageSources.reconcileLatestForTransition(
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
      case "partial":
        return this.markPartial(context, targetPath, outcome.error, correlationId);
    }
  }

  private async markPartial(
    context: TriageAcceptContext,
    targetPath: string,
    error: unknown,
    correlationId: string,
  ): Promise<never> {
    await this.bestEffortReconcile(targetPath, correlationId);
    this.triageSources.addSourceProblem(
      partialIssue(TRAIL_TRIAGE_PATH, context.sourceDelete.issueId),
    );
    this.workflowSources.addSourceProblem(
      targetPath,
      partialIssue(targetPath, context.targetCreate.issue.id),
    );
    this.recordOutcome(context, "partial", correlationId);
    throw new TriageAcceptError(
      "partial",
      "Triage Accept reached a partial cross-source state. Review the Data Issues before retrying.",
      error,
    );
  }

  private async bestEffortReconcile(
    targetPath: string,
    correlationId: string,
  ): Promise<void> {
    await this.triageSources.reconcileLatestForTransition(
      "triage.accept-failure",
      correlationId,
    );
    await this.workflowSources.reconcileSourceForTransition(
      targetPath,
      "triage.accept-failure",
      correlationId,
    );
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

  private mapError(error: unknown): TriageAcceptError {
    if (error instanceof TriageAcceptError) return error;
    if (
      error instanceof TrailTriageSourceMutationError
      || error instanceof TrailProjectSourceMutationError
    ) {
      return new TriageAcceptError(error.code, error.message, error);
    }
    return new TriageAcceptError(
      "persistence-failed",
      error instanceof Error ? error.message : "Triage Accept persistence failed",
      error,
    );
  }
}
