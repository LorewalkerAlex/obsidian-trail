import type { TrailMilestone } from "../model/trail-entities";
import type { TrailTimestamp } from "../model/trail-values";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { validateTrailMilestone } from "../validation/trail-record-validation";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailMilestoneCommand {
  readonly commandId: string;
  readonly due?: TrailTimestamp;
  readonly milestoneId: string;
  readonly projectId: string;
  readonly title: string;
}

export interface EditTrailMilestonePropertiesCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: TrailTimestamp;
  readonly expectedMilestone: TrailMilestone;
  readonly title: string;
}

export interface TrailMilestonePlan {
  readonly milestone: TrailMilestone;
  readonly plan: TrailMutationPlan;
}

/** Creates a Project-scoped Milestone without inventing an independent lifecycle. */
export function planCreateTrailMilestone(
  state: TrailPlanningState,
  command: CreateTrailMilestoneCommand,
): TrailPlanResult<TrailMilestonePlan> {
  if (trailPlanningEntityExists(state.domain, command.milestoneId)) {
    return rejectTrailPlan(
      "entity-id-conflict",
      `Trail entity ID already exists: ${command.milestoneId}`,
    );
  }
  const project = state.domain.projectsById.get(command.projectId);
  if (project === undefined) {
    return rejectTrailPlan("project-missing", `Project does not exist: ${command.projectId}`);
  }

  const milestone: TrailMilestone = {
    due: command.due,
    id: command.milestoneId,
    projectId: project.id,
    title: command.title,
  };
  return readyTrailPlan({
    milestone,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "milestone", value: milestone }, kind: "create-entity" }],
      intent: "workflow.milestone.create",
      preconditions: [{ entity: { kind: "project", value: project }, kind: "entity-equals" }],
    }),
  });
}

/** Replaces Milestone-owned details while preserving identity and Project ownership. */
export function planEditTrailMilestoneProperties(
  state: TrailPlanningState,
  command: EditTrailMilestonePropertiesCommand,
): TrailPlanResult<TrailMilestonePlan> {
  const current = state.domain.milestonesById.get(command.expectedMilestone.id);
  if (current === undefined) {
    return rejectTrailPlan(
      "milestone-missing",
      `Milestone does not exist: ${command.expectedMilestone.id}`,
    );
  }
  if (!sameTrailDomainEntity(
    { kind: "milestone", value: current },
    { kind: "milestone", value: command.expectedMilestone },
  )) {
    return rejectTrailPlan(
      "milestone-changed",
      `Milestone changed before action: ${command.expectedMilestone.id}`,
    );
  }

  const milestone: TrailMilestone = {
    ...current,
    description: command.description,
    due: command.due,
    title: command.title,
  };
  const recordIssues = validateTrailMilestone(milestone);
  if (recordIssues.length > 0) {
    return rejectTrailPlan(
      "milestone-invalid",
      recordIssues.map(({ message }) => message).join("; "),
    );
  }

  return readyTrailPlan({
    milestone,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "milestone", value: milestone },
        before: { kind: "milestone", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.milestone.edit-properties",
    }),
  });
}
