import { createStore, type StoreApi } from "zustand/vanilla";

import type { TrailLocation } from "./trail-navigation-state";

export type TrailInspectorTarget =
  | { readonly initiativeId: string; readonly kind: "initiative" }
  | { readonly issueId: string; readonly kind: "issue" }
  | { readonly projectId: string; readonly kind: "project" }
  | { readonly cycleId: string; readonly kind: "cycle" };

export interface TrailInspectorState {
  readonly target: TrailInspectorTarget | null;
  readonly restore: (target: TrailInspectorTarget | null) => void;
}

export type TrailInspectorStore = StoreApi<TrailInspectorState>;

export function trailInspectorTargetForLocation(
  location: TrailLocation,
): TrailInspectorTarget | null {
  switch (location.kind) {
    case "initiative":
      return { initiativeId: location.initiativeId, kind: "initiative" };
    case "issue":
      return { issueId: location.issueId, kind: "issue" };
    case "project":
      return { projectId: location.projectId, kind: "project" };
    case "cycle":
      return { cycleId: location.cycleId, kind: "cycle" };
    default:
      return null;
  }
}

export function trailInspectorTargetsEqual(
  left: TrailInspectorTarget | null,
  right: TrailInspectorTarget | null,
): boolean {
  if (left === null || right === null) return left === right;
  if (left.kind !== right.kind) return false;

  switch (left.kind) {
    case "initiative":
      return right.kind === "initiative" && left.initiativeId === right.initiativeId;
    case "issue":
      return right.kind === "issue" && left.issueId === right.issueId;
    case "project":
      return right.kind === "project" && left.projectId === right.projectId;
    case "cycle":
      return right.kind === "cycle" && left.cycleId === right.cycleId;
  }
}

export function createTrailInspectorStore(): TrailInspectorStore {
  return createStore<TrailInspectorState>((set, get) => ({
    restore: (target) => {
      if (!trailInspectorTargetsEqual(get().target, target)) set({ target });
    },
    target: null,
  }));
}
