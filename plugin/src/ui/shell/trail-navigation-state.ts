import { createStore, type StoreApi } from "zustand/vanilla";

export type TrailProductLocation =
  | { readonly kind: "cycles" }
  | { readonly kind: "home" }
  | { readonly initiativeId: string; readonly kind: "initiative" }
  | { readonly issueId: string; readonly kind: "issue" }
  | { readonly projectId: string; readonly kind: "project" }
  | { readonly kind: "projects" }
  | { readonly kind: "triage" }
  | { readonly cycleId: string; readonly kind: "cycle" };

export type TrailLocation =
  | TrailProductLocation
  | { readonly kind: "foundation" };

export type TrailSidebarMode = "navigation" | "search";

export interface TrailNavigationState {
  readonly location: TrailLocation;
  readonly sidebarMode: TrailSidebarMode;
  readonly closeSearch: () => void;
  readonly openSearch: () => void;
  readonly restore: (location: TrailLocation) => void;
}

export type TrailNavigationStore = StoreApi<TrailNavigationState>;

export function trailLocationsEqual(
  left: TrailLocation,
  right: TrailLocation,
): boolean {
  if (left.kind !== right.kind) return false;

  switch (left.kind) {
    case "cycle":
      return right.kind === "cycle" && left.cycleId === right.cycleId;
    case "initiative":
      return right.kind === "initiative" && left.initiativeId === right.initiativeId;
    case "issue":
      return right.kind === "issue" && left.issueId === right.issueId;
    case "project":
      return right.kind === "project" && left.projectId === right.projectId;
    default:
      return true;
  }
}

export function createTrailNavigationStore(
  initialLocation: TrailLocation = { kind: "home" },
): TrailNavigationStore {
  return createStore<TrailNavigationState>((set, get) => ({
    closeSearch: () => {
      if (get().sidebarMode !== "navigation") set({ sidebarMode: "navigation" });
    },
    location: initialLocation,
    openSearch: () => {
      if (get().sidebarMode !== "search") set({ sidebarMode: "search" });
    },
    restore: (location) => {
      if (!trailLocationsEqual(get().location, location)) set({ location });
    },
    sidebarMode: "navigation",
  }));
}
