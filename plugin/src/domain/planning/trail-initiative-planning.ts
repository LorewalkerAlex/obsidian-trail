import type { TrailInitiative } from "../model/trail-entities";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../rules/trail-label-rules";
import { validateTrailInitiative } from "../validation/trail-record-validation";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailInitiativeCommand {
  readonly commandId: string;
  readonly initiativeId: string;
  readonly title: string;
}

export interface EditTrailInitiativePropertiesCommand {
  readonly commandId: string;
  readonly description?: string;
  readonly due?: number;
  readonly expectedInitiative: TrailInitiative;
  readonly labelIds: readonly string[];
  readonly priority?: TrailInitiative["priority"];
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

/** Replaces the complete lightweight Initiative details snapshot while preserving identity. */
export function planEditTrailInitiativeProperties(
  state: TrailPlanningState,
  command: EditTrailInitiativePropertiesCommand,
): TrailPlanResult<TrailInitiativePlan> {
  const current = state.domain.initiativesById.get(command.expectedInitiative.id);
  if (current === undefined) {
    return rejectTrailPlan(
      "initiative-missing",
      `Initiative does not exist: ${command.expectedInitiative.id}`,
    );
  }
  if (!sameTrailDomainEntity(
    { kind: "initiative", value: current },
    { kind: "initiative", value: command.expectedInitiative },
  )) {
    return rejectTrailPlan(
      "initiative-changed",
      `Initiative changed before action: ${command.expectedInitiative.id}`,
    );
  }

  const initiative: TrailInitiative = {
    ...current,
    description: command.description,
    due: command.due,
    labelIds: [...command.labelIds],
    priority: command.priority,
    title: command.title,
  };
  const recordIssues = validateTrailInitiative(initiative);
  if (recordIssues.length > 0) {
    return rejectTrailPlan(
      "initiative-invalid",
      recordIssues.map(({ message }) => message).join("; "),
    );
  }

  const labelViolations = findTrailLabelSelectionViolations(
    state.configuration,
    "initiative",
    initiative.labelIds,
  );
  const labelViolation = labelViolations[0];
  if (labelViolation !== undefined) {
    switch (labelViolation.kind) {
      case "label-missing":
        return rejectTrailPlan(
          "label-missing",
          `Initiative references unknown Label ${labelViolation.labelId}`,
        );
      case "label-group-missing":
        return rejectTrailPlan(
          "label-group-missing",
          `Label ${labelViolation.labelId} references unknown LabelGroup ${labelViolation.groupId}`,
        );
      case "label-scope":
        return rejectTrailPlan(
          "label-scope",
          `Label ${labelViolation.labelId} is not registered for Initiatives`,
        );
      case "single-selection":
        return rejectTrailPlan(
          "label-group-single-selection",
          `Initiative selects multiple Labels from single-select group ${labelViolation.groupId}`,
        );
    }
  }

  return readyTrailPlan({
    initiative,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "initiative", value: initiative },
        before: { kind: "initiative", value: current },
        kind: "replace-entity",
      }],
      intent: "workflow.initiative.edit-properties",
    }),
  });
}
