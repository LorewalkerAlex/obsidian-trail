import type { TrailEstimate, TrailPriority } from "../model/trail-values";
import {
  createTrailMutationPlan,
  type TrailMutationPlan,
  type TrailPrecondition,
} from "../../mutation/plans/trail-mutation-plan";
import {
  planChangeTrailWorkflowIssueMilestone,
  planCreateTrailWorkflowIssue,
  planEditTrailWorkflowIssueProperties,
  type TrailWorkflowIssuePlan,
} from "./trail-issue-planning";
import {
  planChangeTrailProjectInitiative,
  planCreateTrailProject,
  planEditTrailProjectProperties,
  type TrailProjectPlan,
} from "./trail-project-planning";
import { readyTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import type { TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailWorkflowIssueDraftCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly effectiveAt: number;
  readonly estimate?: TrailEstimate;
  readonly issueId: string;
  readonly labelIds: readonly string[];
  readonly milestoneId?: string;
  readonly priority?: TrailPriority;
  readonly projectId: string;
  readonly title: string;
}

export interface CreateTrailProjectDraftCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly initiativeId?: string;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly projectId: string;
  readonly title: string;
}

function withWorkflowIssue(
  state: TrailPlanningState,
  issue: TrailWorkflowIssuePlan["issue"],
): TrailPlanningState {
  const issuesById = new Map(state.domain.issuesById);
  issuesById.set(issue.id, issue);
  return {
    ...state,
    domain: {
      ...state.domain,
      issuesById,
    },
  };
}

function withProject(
  state: TrailPlanningState,
  project: TrailProjectPlan["project"],
): TrailPlanningState {
  const projectsById = new Map(state.domain.projectsById);
  projectsById.set(project.id, project);
  return {
    ...state,
    domain: {
      ...state.domain,
      projectsById,
    },
  };
}

function preconditionReferencesEntity(
  precondition: TrailPrecondition,
  entityId: string,
): boolean {
  switch (precondition.kind) {
    case "entity-absent":
      return precondition.entityId === entityId;
    case "entity-equals":
      return precondition.entity.value.id === entityId;
    case "configuration-equals":
    case "workspace-state-equals":
      return false;
  }
}

/**
 * A composed create reuses normal planners against an ephemeral target snapshot.
 * Preconditions about that ephemeral target itself must not escape: the final
 * logical plan owns one Create(target) and therefore derives target absence.
 */
function externalPreconditions(
  plan: TrailMutationPlan,
  targetEntityId: string,
): readonly TrailPrecondition[] {
  return plan.preconditions.filter(
    (precondition) => !preconditionReferencesEntity(precondition, targetEntityId),
  );
}

/**
 * Standard Issue Composer creation is one logical Create that reuses the same
 * property and Milestone planners used by later edits. Status still comes only
 * from normal Workflow Issue creation semantics.
 */
export function planCreateTrailWorkflowIssueFromDraft(
  state: TrailPlanningState,
  command: CreateTrailWorkflowIssueDraftCommand,
): TrailPlanResult<TrailWorkflowIssuePlan> {
  const created = planCreateTrailWorkflowIssue(state, {
    commandId: command.commandId,
    effectiveAt: command.effectiveAt,
    issueId: command.issueId,
    projectId: command.projectId,
    title: command.title,
  });
  if (created.kind !== "ready") return created;

  const edited = planEditTrailWorkflowIssueProperties(
    withWorkflowIssue(state, created.plan.issue),
    {
      commandId: command.commandId,
      description: command.description,
      due: command.due,
      estimate: command.estimate,
      expectedIssue: created.plan.issue,
      labelIds: command.labelIds,
      priority: command.priority,
      title: command.title,
    },
  );
  if (edited.kind !== "ready") return edited;

  let issue = edited.plan.issue;
  let milestonePreconditions: readonly TrailPrecondition[] = [];
  if (command.milestoneId !== undefined) {
    const milestone = planChangeTrailWorkflowIssueMilestone(
      withWorkflowIssue(state, issue),
      {
        commandId: command.commandId,
        expectedIssue: issue,
        targetMilestoneId: command.milestoneId,
      },
    );
    if (milestone.kind !== "ready") return milestone;
    issue = milestone.plan.issue;
    milestonePreconditions = externalPreconditions(milestone.plan.plan, issue.id);
  }

  return readyTrailPlan({
    issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "workflow.issue.create",
      preconditions: [
        ...externalPreconditions(created.plan.plan, issue.id),
        ...milestonePreconditions,
      ],
    }),
  });
}

/**
 * Standard Project Composer creation is one logical Create that reuses normal
 * Project property and Initiative planners while retaining the configured
 * Unstarted default Status.
 */
export function planCreateTrailProjectFromDraft(
  state: TrailPlanningState,
  command: CreateTrailProjectDraftCommand,
): TrailPlanResult<TrailProjectPlan> {
  const created = planCreateTrailProject(state, {
    commandId: command.commandId,
    projectId: command.projectId,
    title: command.title,
  });
  if (created.kind !== "ready") return created;

  const edited = planEditTrailProjectProperties(
    withProject(state, created.plan.project),
    {
      commandId: command.commandId,
      description: command.description,
      due: command.due,
      expectedProject: created.plan.project,
      labelIds: command.labelIds,
      priority: command.priority,
      title: command.title,
    },
  );
  if (edited.kind !== "ready") return edited;

  let project = edited.plan.project;
  let initiativePreconditions: readonly TrailPrecondition[] = [];
  if (command.initiativeId !== undefined) {
    const initiative = planChangeTrailProjectInitiative(
      withProject(state, project),
      {
        commandId: command.commandId,
        expectedProject: project,
        targetInitiativeId: command.initiativeId,
      },
    );
    if (initiative.kind !== "ready") return initiative;
    project = initiative.plan.project;
    initiativePreconditions = externalPreconditions(initiative.plan.plan, project.id);
  }

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "project", value: project }, kind: "create-entity" }],
      intent: "workflow.project.create",
      preconditions: initiativePreconditions,
    }),
    project,
  });
}
