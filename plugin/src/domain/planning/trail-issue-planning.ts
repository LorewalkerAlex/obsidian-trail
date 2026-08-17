import type { TrailWorkflowIssue } from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { canTrailProjectAcceptWorkflowIssue } from "../rules/trail-project-rules";
import {
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../rules/trail-status-rules";
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
  readonly projectId?: string;
  readonly title: string;
}

export interface ChangeTrailWorkflowIssueStatusCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly estimate?: number;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly targetStatusDefinitionId: string;
}

export interface MoveTrailWorkflowIssueProjectCommand {
  readonly commandId: string;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly targetProjectId?: string;
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
  const project = command.projectId === undefined
    ? undefined
    : state.domain.projectsById.get(command.projectId);
  if (command.projectId !== undefined && project === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.projectId}`);
  }
  if (project !== undefined) {
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
  }

  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    id: command.issueId,
    labelIds: [],
    ...(project === undefined ? {} : { projectId: project.id }),
    statusDefinitionId: status.id,
    title: command.title,
  };
  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "workflow.issue.create",
      preconditions: project === undefined
        ? []
        : [{ entity: { kind: "project", value: project }, kind: "entity-equals" }],
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

function sameWorkflowIssue(left: TrailWorkflowIssue, right: TrailWorkflowIssue): boolean {
  return sameTrailDomainEntity(
    { kind: "issue", value: left },
    { kind: "issue", value: right },
  );
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

  const targetProject = command.targetProjectId === undefined
    ? undefined
    : state.domain.projectsById.get(command.targetProjectId);
  if (command.targetProjectId !== undefined && targetProject === undefined) {
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
  if (targetProject !== undefined) {
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
  }

  const targetProjectId = targetProject?.id;
  const issue: TrailWorkflowIssue = targetProjectId === current.projectId
    ? current
    : {
        ...current,
        milestoneId: undefined,
        projectId: targetProjectId,
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
      preconditions: targetProject === undefined
        ? []
        : [{ entity: { kind: "project", value: targetProject }, kind: "entity-equals" }],
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
    if (current.projectId === undefined) {
      return rejectTrailPlan(
        "milestone-project-required",
        "A project-less Workflow Issue cannot reference a Milestone",
      );
    }
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