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
  isTrailEstimateCarrier,
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import {
  createTrailMutationPlan,
  projectMutationEntity,
  workflowIssueMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import {
  selectEffectiveEntityIdSet,
  selectEffectiveProjectById,
  selectEffectiveWorkflowIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailProjectSourceSync } from "../../source-sync/projects/trail-project-source-sync";
import type { TrailEntityMutationReceipt } from "../trail-application-contracts";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  normalizeTrailCommandTitle,
  TrailCommandValidationError,
  type TrailCommandEnvironment,
} from "../trail-command";

interface CreateWorkflowIssueCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly issueId: string;
  readonly kind: "workflow.issue.create";
  readonly projectId: string;
  readonly title: string;
}

interface ChangeWorkflowIssueStatusCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly estimate?: number;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly issueId: string;
  readonly kind: "workflow.issue.status";
  readonly targetStatusDefinitionId: string;
}

export type TrailWorkflowIssuePlanResult =
  | { readonly kind: "needs-input"; readonly requiredInput: "estimate" }
  | { readonly issue: TrailWorkflowIssue; readonly kind: "ready"; readonly plan: TrailMutationPlan }
  | { readonly kind: "rejected"; readonly reason: string }
  | { readonly entityId: string; readonly kind: "unchanged" };

export class TrailWorkflowIssueApplicationError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TrailWorkflowIssueApplicationError";
  }
}

export class WorkflowNeedsInputError extends TrailWorkflowIssueApplicationError {
  public constructor(
    readonly requiredInput: "estimate",
    message: string,
  ) {
    super(message);
    this.name = "WorkflowNeedsInputError";
  }
}

function normalizeCommand<T>(factory: () => T): T {
  try {
    return factory();
  } catch (error: unknown) {
    if (error instanceof TrailCommandValidationError) {
      throw new TrailWorkflowIssueApplicationError(error.message, error);
    }
    throw error;
  }
}

export function normalizeCreateWorkflowIssueCommand(
  projectId: string,
  title: string,
  environment: TrailCommandEnvironment,
): CreateWorkflowIssueCommand {
  return normalizeCommand(() => ({
    commandId: normalizeTrailCommandId(environment.createId(), "Command ID"),
    effectiveAt: normalizeTrailCommandTime(environment),
    issueId: normalizeTrailCommandId(environment.createId(), "Workflow Issue ID"),
    kind: "workflow.issue.create" as const,
    projectId: normalizeTrailCommandId(projectId, "Project ID"),
    title: normalizeTrailCommandTitle(title, "Workflow Issue"),
  }));
}

export function normalizeChangeWorkflowIssueStatusCommand(
  expectedIssue: TrailWorkflowIssue,
  targetStatusDefinitionId: string,
  estimate: number | undefined,
  environment: TrailCommandEnvironment,
): ChangeWorkflowIssueStatusCommand {
  if (estimate !== undefined && !isTrailEstimateCarrier(estimate)) {
    throw new TrailWorkflowIssueApplicationError("Estimate must be a non-negative integer");
  }
  return normalizeCommand(() => ({
    commandId: normalizeTrailCommandId(environment.createId(), "Command ID"),
    effectiveAt: normalizeTrailCommandTime(environment),
    estimate,
    expectedIssue,
    issueId: normalizeTrailCommandId(expectedIssue.id, "Workflow Issue ID"),
    kind: "workflow.issue.status" as const,
    targetStatusDefinitionId: normalizeTrailCommandId(
      targetStatusDefinitionId,
      "Target StatusDefinition ID",
    ),
  }));
}

export function planCreateWorkflowIssue(
  command: CreateWorkflowIssueCommand,
  configuration: TrailConfiguration,
  currentProject: TrailProject | undefined,
  existingEntityIds: ReadonlySet<string>,
): TrailWorkflowIssuePlanResult {
  if (currentProject === undefined) {
    return { kind: "rejected", reason: `Project does not exist: ${command.projectId}` };
  }
  if (existingEntityIds.has(command.issueId)) {
    return { kind: "rejected", reason: `Trail entity ID already exists: ${command.issueId}` };
  }
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    currentProject.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return { kind: "rejected", reason: `Project status is invalid: ${currentProject.id}` };
  }
  if (projectStatus.category === "completed" || projectStatus.category === "canceled") {
    return { kind: "rejected", reason: "A terminal Project must be reopened before adding non-terminal work" };
  }
  const status = resolveDefaultStatusDefinition(configuration.statuses.issue, "backlog");
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    id: command.issueId,
    labelIds: [],
    projectId: currentProject.id,
    statusDefinitionId: status.id,
    title: command.title,
  };
  return {
    issue,
    kind: "ready",
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: workflowIssueMutationEntity(issue), kind: "create" }],
      intent: "workflow.issue.create",
      preconditions: [{ entity: projectMutationEntity(currentProject), kind: "entity-equals" }],
    }),
  };
}

function targetTerminalAt(
  currentIssue: TrailWorkflowIssue,
  currentCategory: string,
  targetCategory: string,
  effectiveAt: number,
): number | undefined {
  const targetTerminal = targetCategory === "completed" || targetCategory === "canceled";
  if (!targetTerminal) return undefined;
  if (currentCategory === targetCategory && currentIssue.terminalAt !== undefined) {
    return currentIssue.terminalAt;
  }
  return effectiveAt;
}

export function planChangeWorkflowIssueStatus(
  command: ChangeWorkflowIssueStatusCommand,
  configuration: TrailConfiguration,
  currentIssue: TrailWorkflowIssue | undefined,
): TrailWorkflowIssuePlanResult {
  if (currentIssue === undefined) {
    return { kind: "rejected", reason: `Workflow Issue does not exist: ${command.issueId}` };
  }
  if (!sameTrailWorkflowIssue(currentIssue, command.expectedIssue)) {
    return { kind: "rejected", reason: `Workflow Issue changed before action: ${command.issueId}` };
  }
  const currentStatus = resolveStatusDefinition(
    configuration.statuses.issue,
    currentIssue.statusDefinitionId,
  );
  const targetStatus = resolveStatusDefinition(
    configuration.statuses.issue,
    command.targetStatusDefinitionId,
  );
  if (currentStatus === undefined || targetStatus === undefined) {
    return { kind: "rejected", reason: "Workflow Issue status reference is invalid" };
  }
  if (command.estimate !== undefined && targetStatus.category !== "completed") {
    return { kind: "rejected", reason: "Estimate input may only accompany a Completed status change" };
  }
  const estimate = command.estimate ?? currentIssue.estimate;
  if (targetStatus.category === "completed" && estimate === undefined) {
    return { kind: "needs-input", requiredInput: "estimate" };
  }
  const firstStartedAt = currentIssue.firstStartedAt === undefined
    && targetStatus.category === "started"
    && currentStatus.category !== "started"
      ? command.effectiveAt
      : currentIssue.firstStartedAt;
  const terminalAt = targetTerminalAt(
    currentIssue,
    currentStatus.category,
    targetStatus.category,
    command.effectiveAt,
  );
  const issue: TrailWorkflowIssue = {
    ...currentIssue,
    estimate,
    firstStartedAt,
    statusDefinitionId: targetStatus.id,
    terminalAt,
  };
  if (sameTrailWorkflowIssue(issue, currentIssue)) {
    return { entityId: issue.id, kind: "unchanged" };
  }
  return {
    issue,
    kind: "ready",
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: workflowIssueMutationEntity(issue),
        before: workflowIssueMutationEntity(currentIssue),
        kind: "replace",
      }],
      intent: "workflow.issue.replace",
    }),
  };
}

/** User-facing Workflow Issue use cases; Project-source mechanics stay below Application. */
export class TrailWorkflowIssueApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailProjectSourceSync,
    private readonly configuration: TrailConfiguration,
    private readonly commandEnvironment: TrailCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public create(projectId: string, title: string): TrailEntityMutationReceipt {
    const command = normalizeCreateWorkflowIssueCommand(projectId, title, this.commandEnvironment);
    const state = this.runtimeStore.getState();
    const result = planCreateWorkflowIssue(
      command,
      this.configuration,
      selectEffectiveProjectById(state, projectId),
      selectEffectiveEntityIdSet(state),
    );
    return this.execute(command, result);
  }

  public changeStatus(
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ): TrailEntityMutationReceipt {
    const command = normalizeChangeWorkflowIssueStatusCommand(
      expectedIssue,
      targetStatusDefinitionId,
      estimate,
      this.commandEnvironment,
    );
    const result = planChangeWorkflowIssueStatus(
      command,
      this.configuration,
      selectEffectiveWorkflowIssueById(this.runtimeStore.getState(), expectedIssue.id),
    );
    return this.execute(command, result);
  }

  private execute(
    command: CreateWorkflowIssueCommand | ChangeWorkflowIssueStatusCommand,
    result: TrailWorkflowIssuePlanResult,
  ): TrailEntityMutationReceipt {
    const correlationId = command.commandId;
    this.diagnostics.record("command.created", {
      correlationId,
      data: {
        effectiveAt: command.effectiveAt,
        entityId: command.issueId,
        kind: command.kind,
        titleLength: "title" in command ? command.title.length : null,
      },
    });
    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new TrailWorkflowIssueApplicationError(result.reason);
    }
    if (result.kind === "needs-input") {
      this.diagnostics.record("command.needs-input", {
        correlationId,
        data: { kind: command.kind, requiredInput: result.requiredInput },
      });
      throw new WorkflowNeedsInputError(
        result.requiredInput,
        "Estimate is required before completing this Workflow Issue",
      );
    }
    if (result.kind === "unchanged") {
      this.diagnostics.record("command.noop", {
        correlationId,
        data: { entityId: result.entityId, kind: command.kind },
      });
      return { completion: Promise.resolve(), entityId: result.entityId };
    }
    this.diagnostics.record("command.planned", {
      correlationId,
      data: { entityId: result.issue.id, intent: result.plan.intent, kind: command.kind },
    });
    return this.sourceSync.submit({
      actionKind: command.kind,
      correlationId,
      entity: result.issue,
      plan: result.plan,
    });
  }
}
