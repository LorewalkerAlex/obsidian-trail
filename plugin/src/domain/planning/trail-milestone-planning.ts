import type { TrailMilestone } from "../model/trail-entities";
import type { TrailTimestamp } from "../model/trail-values";
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
