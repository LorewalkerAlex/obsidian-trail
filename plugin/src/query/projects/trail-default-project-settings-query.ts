import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export interface TrailDefaultProjectOption {
  readonly id: string;
  readonly title: string;
}

export interface TrailDefaultProjectSettingsReadModel {
  readonly currentProjectId: string;
  readonly projects: readonly TrailDefaultProjectOption[];
}

/** Read-side projection for the Workspace Default Project setting. */
export function selectTrailDefaultProjectSettingsReadModel(
  state: TrailRuntimeState,
): TrailDefaultProjectSettingsReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const workspaceState = readable.authoritative.workspaceState;
  if (workspaceState === null) return null;

  const projects = [...readable.authoritative.domain.projectsById.values()]
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map(({ id, title }) => ({ id, title }));

  if (!projects.some(({ id }) => id === workspaceState.defaultProjectId)) return null;

  return {
    currentProjectId: workspaceState.defaultProjectId,
    projects,
  };
}
