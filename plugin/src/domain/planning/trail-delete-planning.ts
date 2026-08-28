import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { canTrailProjectAcceptWorkflowIssue } from "../rules/trail-project-rules";
import { resolveTrailStatusDefinition } from "../rules/trail-status-rules";
import {
  createTrailMutationPlan,
  type TrailMutationPlan,
  type TrailStateEffect,
} from "../../mutation/plans/trail-mutation-plan";
import {
  readyTrailPlan,
  rejectTrailPlan,
  trailPlanNeedsInput,
  type TrailPlanResult,
} from "./trail-plan-result";
import type { TrailPlanningState } from "./trail-planning-state";

export interface DeleteTrailInitiativeCommand {
  readonly commandId: string;
  readonly expectedInitiative: TrailInitiative;
  readonly replacementInitiativeId?: string;
}

export interface DeleteTrailMilestoneCommand {
  readonly commandId: string;
  readonly expectedMilestone: TrailMilestone;
  readonly replacementMilestoneId?: string;
}

export interface DeleteTrailProjectCommand {
  readonly commandId: string;
  readonly expectedProject: TrailProject;
  readonly replacementProjectId?: string;
}

export interface DeleteTrailWorkflowIssueCommand {
  readonly commandId: string;
  readonly expectedIssue: TrailWorkflowIssue;
}

export interface DeleteTrailCycleCommand {
  readonly commandId: string;
  readonly expectedCycle: TrailCycle;
}

export interface TrailDeletePlan {
  readonly plan: TrailMutationPlan;
}

export function planDeleteTrailInitiative(
  state: TrailPlanningState,
  command: DeleteTrailInitiativeCommand,
): TrailPlanResult<TrailDeletePlan> {
  const current = state.domain.initiativesById.get(command.expectedInitiative.id);
  if (current === undefined) {
    return rejectTrailPlan("initiative-missing", `Initiative does not exist: ${command.expectedInitiative.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "initiative", value: current },
    { kind: "initiative", value: command.expectedInitiative },
  )) {
    return rejectTrailPlan("initiative-changed", `Initiative changed before action: ${current.id}`);
  }

  if (command.replacementInitiativeId === current.id) {
    return rejectTrailPlan("initiative-replacement-invalid", "Deleted Initiative cannot replace itself");
  }
  const replacement = command.replacementInitiativeId === undefined
    ? undefined
    : state.domain.initiativesById.get(command.replacementInitiativeId);
  if (command.replacementInitiativeId !== undefined && replacement === undefined) {
    return rejectTrailPlan(
      "initiative-replacement-missing",
      `Replacement Initiative does not exist: ${command.replacementInitiativeId}`,
    );
  }

  const effects: TrailStateEffect[] = [];
  for (const project of state.domain.projectsById.values()) {
    if (project.initiativeId !== current.id) continue;
    effects.push({
      after: { kind: "project", value: { ...project, initiativeId: replacement?.id } },
      before: { kind: "project", value: project },
      kind: "replace-entity",
    });
  }
  effects.push({ before: { kind: "initiative", value: current }, kind: "delete-entity" });

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects,
      intent: "workflow.initiative.delete",
      preconditions: replacement === undefined
        ? []
        : [{ entity: { kind: "initiative", value: replacement }, kind: "entity-equals" }],
    }),
  });
}

export function planDeleteTrailMilestone(
  state: TrailPlanningState,
  command: DeleteTrailMilestoneCommand,
): TrailPlanResult<TrailDeletePlan> {
  const current = state.domain.milestonesById.get(command.expectedMilestone.id);
  if (current === undefined) {
    return rejectTrailPlan("milestone-missing", `Milestone does not exist: ${command.expectedMilestone.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "milestone", value: current },
    { kind: "milestone", value: command.expectedMilestone },
  )) {
    return rejectTrailPlan("milestone-changed", `Milestone changed before action: ${current.id}`);
  }
  if (command.replacementMilestoneId === current.id) {
    return rejectTrailPlan("milestone-replacement-invalid", "Deleted Milestone cannot replace itself");
  }
  const replacement = command.replacementMilestoneId === undefined
    ? undefined
    : state.domain.milestonesById.get(command.replacementMilestoneId);
  if (command.replacementMilestoneId !== undefined && replacement === undefined) {
    return rejectTrailPlan(
      "milestone-replacement-missing",
      `Replacement Milestone does not exist: ${command.replacementMilestoneId}`,
    );
  }
  if (replacement !== undefined && replacement.projectId !== current.projectId) {
    return rejectTrailPlan(
      "milestone-replacement-project-mismatch",
      "Replacement Milestone must belong to the same Project",
    );
  }

  const effects: TrailStateEffect[] = [];
  for (const issue of state.domain.issuesById.values()) {
    if (issue.milestoneId !== current.id) continue;
    effects.push({
      after: { kind: "issue", value: { ...issue, milestoneId: replacement?.id } },
      before: { kind: "issue", value: issue },
      kind: "replace-entity",
    });
  }
  effects.push({ before: { kind: "milestone", value: current }, kind: "delete-entity" });

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects,
      intent: "workflow.milestone.delete",
      preconditions: replacement === undefined
        ? []
        : [{ entity: { kind: "milestone", value: replacement }, kind: "entity-equals" }],
    }),
  });
}

function projectChildIssues(
  state: TrailPlanningState,
  projectId: string,
): readonly TrailWorkflowIssue[] {
  return [...state.domain.issuesById.values()].filter(
    (issue): issue is TrailWorkflowIssue => issue.context === "workflow" && issue.projectId === projectId,
  );
}

function validateProjectReplacement(
  state: TrailPlanningState,
  deleted: TrailProject,
  replacementProjectId: string,
  childIssues: readonly TrailWorkflowIssue[],
): TrailPlanResult<TrailProject> {
  if (replacementProjectId === deleted.id) {
    return rejectTrailPlan("project-replacement-invalid", "Deleted Project cannot replace itself");
  }
  const replacement = state.domain.projectsById.get(replacementProjectId);
  if (replacement === undefined) {
    return rejectTrailPlan(
      "project-replacement-missing",
      `Replacement Project does not exist: ${replacementProjectId}`,
    );
  }
  const projectStatus = resolveTrailStatusDefinition(
    state.configuration,
    "project",
    replacement.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return rejectTrailPlan(
      "project-replacement-status-invalid",
      `Replacement Project has an invalid StatusDefinition: ${replacement.statusDefinitionId}`,
    );
  }
  for (const child of childIssues) {
    const issueStatus = resolveTrailStatusDefinition(
      state.configuration,
      "issue",
      child.statusDefinitionId,
    );
    if (issueStatus === undefined) {
      return rejectTrailPlan(
        "project-child-status-invalid",
        `Workflow Issue has an invalid StatusDefinition: ${child.statusDefinitionId}`,
      );
    }
    if (!canTrailProjectAcceptWorkflowIssue(projectStatus, issueStatus)) {
      return rejectTrailPlan(
        "project-replacement-not-eligible",
        `Replacement Project cannot accept Workflow Issue without changing its Status: ${child.id}`,
      );
    }
  }
  return readyTrailPlan(replacement);
}

export function planDeleteTrailProject(
  state: TrailPlanningState,
  command: DeleteTrailProjectCommand,
): TrailPlanResult<TrailDeletePlan> {
  const current = state.domain.projectsById.get(command.expectedProject.id);
  if (current === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.expectedProject.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "project", value: current },
    { kind: "project", value: command.expectedProject },
  )) {
    return rejectTrailPlan("project-changed", `Project changed before action: ${current.id}`);
  }
  if (state.workspaceState.defaultProjectId === current.id) {
    return rejectTrailPlan(
      "default-project-delete-forbidden",
      "Current Default Project must be replaced before it can be deleted",
    );
  }

  const childIssues = projectChildIssues(state, current.id);
  let replacement: TrailProject | undefined;
  if (childIssues.length > 0) {
    if (command.replacementProjectId === undefined) {
      return trailPlanNeedsInput(
        "project-replacement-required",
        "Project deletion requires a replacement Project for child Workflow Issues",
      );
    }
    const replacementResult = validateProjectReplacement(
      state,
      current,
      command.replacementProjectId,
      childIssues,
    );
    if (replacementResult.kind !== "ready") return replacementResult;
    replacement = replacementResult.plan;
  }

  const effects: TrailStateEffect[] = [];
  if (replacement !== undefined) {
    for (const issue of childIssues) {
      effects.push({
        after: {
          kind: "issue",
          value: { ...issue, milestoneId: undefined, projectId: replacement.id },
        },
        before: { kind: "issue", value: issue },
        kind: "replace-entity",
      });
    }
  }
  for (const milestone of state.domain.milestonesById.values()) {
    if (milestone.projectId !== current.id) continue;
    effects.push({ before: { kind: "milestone", value: milestone }, kind: "delete-entity" });
  }
  effects.push({ before: { kind: "project", value: current }, kind: "delete-entity" });

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects,
      intent: "workflow.project.delete",
      preconditions: replacement === undefined
        ? []
        : [{ entity: { kind: "project", value: replacement }, kind: "entity-equals" }],
    }),
  });
}

export function planDeleteTrailWorkflowIssue(
  state: TrailPlanningState,
  command: DeleteTrailWorkflowIssueCommand,
): TrailPlanResult<TrailDeletePlan> {
  const current = state.domain.issuesById.get(command.expectedIssue.id);
  if (current === undefined || current.context !== "workflow") {
    return rejectTrailPlan("issue-missing", `Workflow Issue does not exist: ${command.expectedIssue.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "issue", value: current },
    { kind: "issue", value: command.expectedIssue },
  )) {
    return rejectTrailPlan("issue-changed", `Workflow Issue changed before action: ${current.id}`);
  }

  const effects: TrailStateEffect[] = [];
  for (const cycle of state.domain.cyclesById.values()) {
    if (!cycle.issueIds.includes(current.id)) continue;
    effects.push({
      after: {
        kind: "cycle",
        value: { ...cycle, issueIds: cycle.issueIds.filter((issueId) => issueId !== current.id) },
      },
      before: { kind: "cycle", value: cycle },
      kind: "replace-entity",
    });
  }
  effects.push({ before: { kind: "issue", value: current }, kind: "delete-entity" });

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects,
      intent: "workflow.issue.delete",
    }),
  });
}

export function planDeleteTrailCycle(
  state: TrailPlanningState,
  command: DeleteTrailCycleCommand,
): TrailPlanResult<TrailDeletePlan> {
  const current = state.domain.cyclesById.get(command.expectedCycle.id);
  if (current === undefined) {
    return rejectTrailPlan("cycle-missing", `Cycle does not exist: ${command.expectedCycle.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "cycle", value: current },
    { kind: "cycle", value: command.expectedCycle },
  )) {
    return rejectTrailPlan("cycle-changed", `Cycle changed before action: ${current.id}`);
  }

  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ before: { kind: "cycle", value: current }, kind: "delete-entity" }],
      intent: "planning.cycle.delete",
    }),
  });
}
