import type { TrailProject } from "../model/trail-entities";
import { resolveTrailDefaultStatusDefinition } from "../rules/trail-status-rules";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface CreateTrailProjectCommand {
  readonly commandId: string;
  readonly projectId: string;
  readonly title: string;
}

export interface CreateTrailProjectPlan {
  readonly plan: TrailMutationPlan;
  readonly project: TrailProject;
}

export function planCreateTrailProject(
  state: TrailPlanningState,
  command: CreateTrailProjectCommand,
): TrailPlanResult<CreateTrailProjectPlan> {
  if (trailPlanningEntityExists(state.domain, command.projectId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.projectId}`);
  }
  const status = resolveTrailDefaultStatusDefinition(
    state.configuration,
    "project",
    "unstarted",
  );
  const project: TrailProject = {
    id: command.projectId,
    labelIds: [],
    statusDefinitionId: status.id,
    title: command.title,
  };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "project", value: project }, kind: "create-entity" }],
      intent: "workflow.project.create",
    }),
    project,
  });
}
