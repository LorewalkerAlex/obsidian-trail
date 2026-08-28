import type { TrailWorkflowIssue } from "../model/trail-entities";
import type { TrailEstimate } from "../model/trail-values";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../rules/trail-label-rules";
import { canTrailProjectAcceptWorkflowIssue } from "../rules/trail-project-rules";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../rules/trail-status-rules";
import { validateTrailIssue } from "../validation/trail-record-validation";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import {
  readyTrailPlan,
  rejectTrailPlan,
  trailPlanNeedsInput,
  type TrailPlanResult,
} from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailWorkflowIssueCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly issueId: string;
  readonly projectId: string;
  readonly title: string;
}

export interface EditTrailWorkflowIssuePropertiesCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly estimate?: TrailEstimate;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly labelIds: readonly string[];
  readonly priority?: TrailWorkflowIssue["priority"];
  readonly title: string;
}

export interface ChangeTrailWorkflowIssueStatusCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly estimate?: TrailEstimate;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly targetStatusDefinitionId: string;
}

export interface MoveTrailWorkflowIssueProjectCommand {
  readonly commandId: string;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly targetProjectId: string;
}

export interface ChangeTrailWorkflowIssueMilestoneCommand {
  readonly commandId: string;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly targetMilestoneId?: string;
}

export interface TrailWorkflowIssuePlan {
  readonly issue: TrailWorkflowIssue;
  readonly plan: TrailMutationPlan;
}

export function planCreateTrailWorkflowIssue(
  state: TrailPlanningState,
  command: CreateTrailWorkflowIssueCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  if (trailPlanningEntityExists(state.domain, command.issueId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.issueId}`);
  }
  const status = resolveTrailDefaultStatusDefinition(state.configuration, "issue", "backlog");
  const project = state.domain.projectsById.get(command.projectId);
  if (project === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.projectId}`);
  }
  const projectStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    project.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return rejectTrailPlan("project-status-invalid", `Project status is invalid: ${project.id}`);
  }
  if (!canTrailProjectAcceptWorkflowIssue(projectStatus, status)) {
    return rejectTrailPlan(
      "project-terminal",
      "A terminal Project must be reopened before adding non-terminal work",
    );
  }

  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    id: command.issueId,
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: status.id,
    title: command.title,
  };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "workflow.issue.create",
      preconditions: [{ entity: { kind: "project", value: project }, kind: "entity-equals" }],
    }),
  });
}

function sameWorkflowIssue(left: TrailWorkflowIssue, right: TrailWorkflowIssue): boolean {
  return sameTrailDomainEntity(
    { kind: "issue", value: left },
    { kind: "issue", value: right },
  );
}

/**
 * Planning-property edits replace one complete editable snapshot while preserving
 * identity, lifecycle timestamps, Status, and structural relationships.
 */
export function planEditTrailWorkflowIssueProperties(
  state: TrailPlanningState,
  command: EditTrailWorkflowIssuePropertiesCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  const current = state.domain.issuesById.get(command.expectedIssue.id);
  if (current?.context !== "workflow") {
    return rejectTrailPlan(
      "workflow-issue-missing",
      `Workflow Issue does not exist: ${command.expectedIssue.id}`,
    );
  }
  if (!sameWorkflowIssue(current, command.expectedIssue)) {
    return rejectTrailPlan(
      "workflow-issue-changed",
      `Workflow Issue changed before action: ${command.expectedIssue.id}`,
    );
  }

  const status = resolveTrailStatusDefinition(
    state.configuration,
    "issue",
    current.statusDefinitionId,
  );
  if (status === undefined) {
    return rejectTrailPlan("status-reference-invalid", "Workflow Issue status reference is invalid");
  }
  if (status.category === "completed" && command.estimate === undefined) {
    return rejectTrailPlan(
      "estimate-required",
      "Completed Workflow Issue Estimate cannot be cleared",
    );
  }

  const issue: TrailWorkflowIssue = {
    ...current,
    description: command.description,
    due: command.due,
    estimate: command.estimate,
    labelIds: [...command.labelIds],
    priority: command.priority,
    title: command.title,
  };
  const recordIssues = validateTrailIssue(issue);
  if (recordIssues.length > 0) {
    return rejectTrailPlan(
      "workflow-issue-invalid",
      recordIssues.map(({ message }) => message).join("; "),
    );
  }

  const labelViolations = findTrailLabelSelectionViolations(
    state.configuration,
    "issue",
    issue.labelIds,
  );
  const labelViolation = labelViolations[0];
  if (labelViolation !== undefined) {
    switch (labelViolation.kind) {
      case "label-missing":
        return rejectTrailPlan(
          "label-missing",
          `Workflow Issue references unknown Label ${labelViolation.labelId}`,
        );
      case "label-group-missing":
        return rejectTrailPlan(
          "label-group-missing",
          `Label ${labelViolation.labelId} references unknown LabelGroup ${labelViolation.groupId}`,
        );
      case "label-scope":
        return rejectTrailPlan(
          "label-scope",
          `Label ${labelViolation.labelId} is not registered for Workflow Issues`,
        );
      case "single-selection":
        return rejectTrailPlan(
          "label-group-single-selection",
          `Workflow Issue selects multiple Labels from single-select group ${labelViolation.groupId}`,
        );
    }
  }

  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.issue.edit-properties",
    }),
  });
}

function terminalAtFor(
  issue: TrailWorkflowIssue,
  currentCategory: string,
  targetCategory: string,
  effectiveAt: number,
): number | undefined {
  const targetTerminal = targetCategory === "completed" || targetCategory === "canceled";
  if (!targetTerminal) return undefined;
  if (currentCategory === targetCategory && issue.terminalAt !== undefined) return issue.terminalAt;
  return effectiveAt;
}

export function planChangeTrailWorkflowIssueStatus(
  state: TrailPlanningState,
  command: ChangeTrailWorkflowIssueStatusCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  const current = state.domain.issuesById.get(command.expectedIssue.id);
  if (current?.context !== "workflow") {
    return rejectTrailPlan(
      "workflow-issue-missing",
      `Workflow Issue does not exist: ${command.expectedIssue.id}`,
    );
  }
  if (!sameWorkflowIssue(current, command.expectedIssue)) {
    return rejectTrailPlan(
      "workflow-issue-changed",
      `Workflow Issue changed before action: ${command.expectedIssue.id}`,
    );
  }

  const currentStatus = resolveTrailStatusDefinition(
    state.configuration,
    "issue",
    current.statusDefinitionId,
  );
  const targetStatus = resolveTrailStatusDefinition(
    state.configuration,
    "issue",
    command.targetStatusDefinitionId,
  );
  if (currentStatus === undefined || targetStatus === undefined) {
    return rejectTrailPlan("status-reference-invalid", "Workflow Issue status reference is invalid");
  }

  const reopensNonTerminalWork = isTrailTerminalStatusDefinition(currentStatus)
    && !isTrailTerminalStatusDefinition(targetStatus);
  const reopeningProject = reopensNonTerminalWork
    ? state.domain.projectsById.get(current.projectId)
    : undefined;
  if (reopensNonTerminalWork && reopeningProject === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${current.projectId}`);
  }
  if (reopeningProject !== undefined) {
    const projectStatus = resolveTrailStatusDefinition(
      state.configuration,
      "project",
      reopeningProject.statusDefinitionId,
    );
    if (projectStatus === undefined) {
      return rejectTrailPlan(
        "project-status-invalid",
        `Project status is invalid: ${reopeningProject.id}`,
      );
    }
    if (!canTrailProjectAcceptWorkflowIssue(projectStatus, targetStatus)) {
      return rejectTrailPlan(
        "project-terminal",
        "A terminal Project must be reopened before reopening non-terminal work",
      );
    }
  }

  if (command.estimate !== undefined && targetStatus.category !== "completed") {
    return rejectTrailPlan(
      "estimate-not-applicable",
      "Estimate input may only accompany a Completed status change",
    );
  }
  const estimate = command.estimate ?? current.estimate;
  if (targetStatus.category === "completed" && estimate === undefined) {
    return trailPlanNeedsInput("estimate-required", "Estimate is required before completing this Workflow Issue");
  }

  const firstStartedAt = current.firstStartedAt === undefined
    && targetStatus.category === "started"
    && currentStatus.category !== "started"
      ? command.effectiveAt
      : current.firstStartedAt;
  const issue: TrailWorkflowIssue = {
    ...current,
    estimate,
    firstStartedAt,
    statusDefinitionId: targetStatus.id,
    terminalAt: terminalAtFor(
      current,
      currentStatus.category,
      targetStatus.category,
      command.effectiveAt,
    ),
  };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.issue.replace",
      preconditions: reopeningProject === undefined
        ? []
        : [{ entity: { kind: "project", value: reopeningProject }, kind: "entity-equals" }],
    }),
  });
}

/** Changing Project membership preserves Issue identity and clears any old Project-scoped Milestone. */
export function planMoveTrailWorkflowIssueProject(
  state: TrailPlanningState,
  command: MoveTrailWorkflowIssueProjectCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  const current = state.domain.issuesById.get(command.expectedIssue.id);
  if (current?.context !== "workflow") {
    return rejectTrailPlan(
      "workflow-issue-missing",
      `Workflow Issue does not exist: ${command.expectedIssue.id}`,
    );
  }
  if (!sameWorkflowIssue(current, command.expectedIssue)) {
    return rejectTrailPlan(
      "workflow-issue-changed",
      `Workflow Issue changed before action: ${command.expectedIssue.id}`,
    );
  }
  const targetProject = state.domain.projectsById.get(command.targetProjectId);
  if (targetProject === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.targetProjectId}`);
  }

  const issueStatus = resolveTrailStatusDefinition(
    state.configuration,
    "issue",
    current.statusDefinitionId,
  );
  if (issueStatus === undefined) {
    return rejectTrailPlan("status-reference-invalid", "Workflow Issue status reference is invalid");
  }
  const targetProjectStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    targetProject.statusDefinitionId,
  );
  if (targetProjectStatus === undefined) {
    return rejectTrailPlan(
      "project-status-invalid",
      `Project status is invalid: ${targetProject.id}`,
    );
  }
  if (
    targetProject.id !== current.projectId
    && !canTrailProjectAcceptWorkflowIssue(targetProjectStatus, issueStatus)
  ) {
    return rejectTrailPlan(
      "project-terminal",
      "A terminal Project must be reopened before receiving non-terminal work",
    );
  }

  const issue: TrailWorkflowIssue = targetProject.id === current.projectId
    ? current
    : {
        ...current,
        milestoneId: undefined,
        projectId: targetProject.id,
      };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.issue.move-project",
      preconditions: [{ entity: { kind: "project", value: targetProject }, kind: "entity-equals" }],
    }),
  });
}

/** Milestone membership is legal only within the Issue's current Project. */
export function planChangeTrailWorkflowIssueMilestone(
  state: TrailPlanningState,
  command: ChangeTrailWorkflowIssueMilestoneCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  const current = state.domain.issuesById.get(command.expectedIssue.id);
  if (current?.context !== "workflow") {
    return rejectTrailPlan(
      "workflow-issue-missing",
      `Workflow Issue does not exist: ${command.expectedIssue.id}`,
    );
  }
  if (!sameWorkflowIssue(current, command.expectedIssue)) {
    return rejectTrailPlan(
      "workflow-issue-changed",
      `Workflow Issue changed before action: ${command.expectedIssue.id}`,
    );
  }

  const targetMilestone = command.targetMilestoneId === undefined
    ? undefined
    : state.domain.milestonesById.get(command.targetMilestoneId);
  if (command.targetMilestoneId !== undefined && targetMilestone === undefined) {
    return rejectTrailPlan(
      "milestone-missing",
      `Milestone does not exist: ${command.targetMilestoneId}`,
    );
  }
  if (targetMilestone !== undefined) {
    if (targetMilestone.projectId !== current.projectId) {
      return rejectTrailPlan(
        "milestone-project-mismatch",
        "Workflow Issue Milestone must belong to the same Project",
      );
    }
  }

  const issue: TrailWorkflowIssue = targetMilestone?.id === current.milestoneId
    ? current
    : { ...current, milestoneId: targetMilestone?.id };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "issue", value: issue },
        before: { kind: "issue", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.issue.change-milestone",
      preconditions: targetMilestone === undefined
        ? []
        : [{ entity: { kind: "milestone", value: targetMilestone }, kind: "entity-equals" }],
    }),
  });
}
