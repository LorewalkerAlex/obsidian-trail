import type { TrailWorkspaceState } from "../model/trail-workspace-state";
import { sameTrailWorkspaceState } from "../rules/trail-domain-equality";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import type { TrailPlanningState } from "./trail-planning-state";

export interface SetTrailDefaultProjectCommand {
  readonly commandId: string;
  readonly expectedWorkspaceState: TrailWorkspaceState;
  readonly projectId: string;
}

export interface TrailWorkspacePlan {
  readonly plan: TrailMutationPlan;
  readonly workspaceState: TrailWorkspaceState;
}

/** Repoints the required Workspace Default to one existing ordinary Project. */
export function planSetTrailDefaultProject(
  state: TrailPlanningState,
  command: SetTrailDefaultProjectCommand,
): TrailPlanResult<TrailWorkspacePlan> {
  if (!sameTrailWorkspaceState(state.workspaceState, command.expectedWorkspaceState)) {
    return rejectTrailPlan("workspace-state-changed", "Workspace State changed before action");
  }
  const project = state.domain.projectsById.get(command.projectId);
  if (project === undefined) {
    return rejectTrailPlan(
      "default-project-missing",
      `Default Project does not exist: ${command.projectId}`,
    );
  }

  const workspaceState: TrailWorkspaceState = {
    ...state.workspaceState,
    defaultProjectId: project.id,
  };
  return readyTrailPlan({
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: workspaceState,
        before: state.workspaceState,
        kind: "replace-workspace-state",
      }],
      intent: "workspace.default-project.set",
      preconditions: [{
        entity: { kind: "project", value: project },
        kind: "entity-equals",
      }],
    }),
    workspaceState,
  });
}
