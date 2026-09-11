import type { TrailProjectApplication } from "../../application/projects/trail-project-application";
import type { TrailProject } from "../../domain/model/trail-entities";
import type { TrailProjectDeleteReadModel } from "../../query/projects/trail-project-delete-query";
import {
  selectTrailProjectActionFacts,
  TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID,
  type TrailProjectActionItemReadModel,
  type TrailProjectActionNamedTargetReadModel,
} from "../../query/shared/trail-project-action-query";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import type { TrailActionMenuItem } from "./trail-action-menu";

export const TRAIL_PROJECT_ACTION_IDS = [
  "project.change-status",
  "project.change-initiative",
  "project.delete",
] as const;
export type TrailProjectActionId = (typeof TRAIL_PROJECT_ACTION_IDS)[number];

export type TrailProjectCollectionActionId = Exclude<TrailProjectActionId, "project.delete">;
export type TrailProjectCollectionActionIntents = Pick<
  TrailProjectApplication,
  "changeInitiative" | "changeStatus"
>;

export interface TrailProjectActionContext {
  readonly actions: readonly TrailActionMenuItem<TrailProjectActionId>[];
  readonly deleteReadModel: TrailProjectDeleteReadModel;
  readonly unavailableReason?: string;
}

export interface TrailProjectCollectionActionContext {
  readonly actions: readonly TrailActionMenuItem<TrailProjectCollectionActionId>[];
  readonly projectIds: readonly string[];
  readonly projects: readonly TrailProject[];
  readonly unavailableReason?: string;
}

export interface TrailProjectActionScopeInput {
  readonly invokedProjectId: string;
  readonly selectedProjectIds: ReadonlySet<string>;
}

function uniqueIds(ids: Iterable<string>): readonly string[] {
  return [...new Set(ids)];
}

/** Right-clicking a selected Project addresses that collection selection. */
export function resolveTrailProjectActionScope(
  input: TrailProjectActionScopeInput,
): readonly string[] {
  return input.selectedProjectIds.has(input.invokedProjectId)
    ? uniqueIds(input.selectedProjectIds)
    : [input.invokedProjectId];
}

export function resolveTrailProjectBulkActionScope(
  selectedProjectIds: ReadonlySet<string>,
): readonly string[] {
  return uniqueIds(selectedProjectIds);
}

function unavailableReason(
  controlKind: TrailRuntimeState["control"]["kind"],
): string | undefined {
  switch (controlKind) {
    case "loading":
      return "Actions are unavailable while Trail is loading.";
    case "refreshing":
      return "Actions are unavailable while Trail is refreshing.";
    case "read-only-error":
      return "Actions are unavailable while Trail is read-only.";
    default:
      return undefined;
  }
}

function intersectTargets(
  projects: readonly TrailProjectActionItemReadModel[],
  selectTargets: (
    project: TrailProjectActionItemReadModel,
  ) => readonly TrailProjectActionNamedTargetReadModel[],
  currentTarget: (project: TrailProjectActionItemReadModel) => string,
): readonly TrailProjectActionNamedTargetReadModel[] {
  const first = projects[0];
  if (first === undefined) return [];
  const remainingTargetIds = projects.slice(1).map((project) => (
    new Set(selectTargets(project).map((target) => target.id))
  ));
  return selectTargets(first).filter((target) => (
    remainingTargetIds.every((targetIds) => targetIds.has(target.id))
    && !projects.every((project) => currentTarget(project) === target.id)
  ));
}

/**
 * Common Project collection actions. Multi-selection legality is the intersection
 * of ordinary per-Project Query targets, never a separate bulk capability model.
 */
export function resolveTrailProjectCollectionActionContext(
  state: TrailRuntimeState,
  projectIds: readonly string[],
): TrailProjectCollectionActionContext | null {
  const normalizedProjectIds = uniqueIds(projectIds);
  if (normalizedProjectIds.length === 0) return null;
  const facts = selectTrailProjectActionFacts(state, normalizedProjectIds);
  if (facts === null) return null;

  const reason = unavailableReason(facts.controlKind);
  if (reason !== undefined) {
    return {
      actions: [],
      projectIds: normalizedProjectIds,
      projects: facts.projects.map(({ expectedProject }) => expectedProject),
      unavailableReason: reason,
    };
  }

  const actions: TrailActionMenuItem<TrailProjectCollectionActionId>[] = [];
  const statusTargets = intersectTargets(
    facts.projects,
    ({ legalStatusTargets }) => legalStatusTargets,
    ({ currentStatusDefinitionId }) => currentStatusDefinitionId,
  );
  if (statusTargets.length > 0) {
    actions.push({
      group: "common-mutation",
      id: "project.change-status",
      label: "Change status",
      targets: statusTargets,
    });
  }

  const initiativeTargets = intersectTargets(
    facts.projects,
    ({ legalInitiativeTargets }) => legalInitiativeTargets,
    ({ currentInitiativeTargetId }) => currentInitiativeTargetId,
  );
  if (initiativeTargets.length > 0) {
    actions.push({
      group: "relationship-lifecycle",
      id: "project.change-initiative",
      label: "Change initiative",
      targets: initiativeTargets,
    });
  }

  return {
    actions,
    projectIds: normalizedProjectIds,
    projects: facts.projects.map(({ expectedProject }) => expectedProject),
  };
}

function requireCollectionAction(
  context: TrailProjectCollectionActionContext,
  actionId: TrailProjectCollectionActionId,
  targetId: string | undefined,
): { readonly action: TrailActionMenuItem<TrailProjectCollectionActionId>; readonly targetId: string } {
  const action = context.actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) throw new Error(`Project action is not available: ${actionId}`);
  if (targetId === undefined || !action.targets.some((target) => target.id === targetId)) {
    throw new Error(`Project action target is not available: ${actionId} -> ${targetId ?? "missing"}`);
  }
  return { action, targetId };
}

function collectCompletion(
  result: ReturnType<TrailProjectCollectionActionIntents["changeStatus"]>,
  completions: Promise<void>[],
): void {
  if (result.kind === "submitted") {
    completions.push(result.receipt.completion);
    return;
  }
  if (result.kind === "needs-input") throw new Error(result.input.message);
}

export async function executeTrailProjectCollectionAction(
  intents: TrailProjectCollectionActionIntents,
  context: TrailProjectCollectionActionContext,
  actionId: TrailProjectCollectionActionId,
  targetId?: string,
): Promise<void> {
  const resolved = requireCollectionAction(context, actionId, targetId);
  const completions: Promise<void>[] = [];
  for (const project of context.projects) {
    if (resolved.action.id === "project.change-status") {
      collectCompletion(intents.changeStatus(project, resolved.targetId), completions);
    } else {
      collectCompletion(
        intents.changeInitiative(
          project,
          resolved.targetId === TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID
            ? undefined
            : resolved.targetId,
        ),
        completions,
      );
    }
  }
  await Promise.all(completions);
}

/** Stable Project delete action semantics for the focused Project Workspace. */
export function resolveTrailProjectActionContext(
  deleteReadModel: TrailProjectDeleteReadModel,
  writable: boolean,
): TrailProjectActionContext {
  if (!writable) {
    return {
      actions: [],
      deleteReadModel,
      unavailableReason: "Trail is temporarily read-only.",
    };
  }
  if (deleteReadModel.isDefaultProject) {
    return {
      actions: [],
      deleteReadModel,
      unavailableReason: "Change the Default Project in Trail settings before deleting this project.",
    };
  }

  return {
    actions: [{
      group: "destructive",
      id: "project.delete",
      label: "Delete project",
      targets: [],
    }],
    deleteReadModel,
  };
}
