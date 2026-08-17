import type { TrailInitiative } from "../model/trail-entities";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailInitiativeCommand {
  readonly commandId: string;
  readonly initiativeId: string;
  readonly title: string;
}

export interface TrailInitiativePlan {
  readonly initiative: TrailInitiative;
  readonly plan: TrailMutationPlan;
}

/** Creates the managed Initiative root without inventing workflow state or derived completion facts. */
export function planCreateTrailInitiative(
  state: TrailPlanningState,
  command: CreateTrailInitiativeCommand,
): TrailPlanResult<TrailInitiativePlan> {
  if (trailPlanningEntityExists(state.domain, command.initiativeId)) {
    return rejectTrailPlan(
      "entity-id-conflict",
      `Trail entity ID already exists: ${command.initiativeId}`,
    );
  }

  const initiative: TrailInitiative = {
    id: command.initiativeId,
    labelIds: [],
    title: command.title,
  };
  return readyTrailPlan({
    initiative,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "initiative", value: initiative }, kind: "create-entity" }],
      intent: "workflow.initiative.create",
    }),
  });
}
