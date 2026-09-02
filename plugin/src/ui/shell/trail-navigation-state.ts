import { createStore, type StoreApi } from "zustand/vanilla";

export type TrailLocation =
  | { readonly kind: "cycles" }
  | { readonly kind: "home" }
  | { readonly initiativeId: string; readonly kind: "initiative" }
  | { readonly projectId: string; readonly kind: "project" }
  | { readonly kind: "projects" }
  | { readonly kind: "search" }
  | { readonly kind: "triage" };

export function trailLocationsEqual(left: TrailLocation, right: TrailLocation): boolean {
  if (left.kind !== right.kind) return false;

  if (left.kind === "initiative" && right.kind === "initiative") {
    return left.initiativeId === right.initiativeId;
  }
  if (left.kind === "project" && right.kind === "project") {
    return left.projectId === right.projectId;
  }
  return true;
}

export interface TrailNavigationState {
  readonly location: TrailLocation;
  readonly requestId: number;
  readonly navigate: (location: TrailLocation) => void;
  readonly restore: (location: TrailLocation) => void;
}

export type TrailNavigationStore = StoreApi<TrailNavigationState>;

export function createTrailNavigationStore(): TrailNavigationStore {
  return createStore<TrailNavigationState>((set) => ({
    location: { kind: "home" },
    navigate: (location) => set((state) => trailLocationsEqual(state.location, location)
      ? state
      : {
          location,
          requestId: state.requestId + 1,
        }),
    requestId: 0,
    restore: (location) => set((state) => trailLocationsEqual(state.location, location)
      ? state
      : { location }),
  }));
}
