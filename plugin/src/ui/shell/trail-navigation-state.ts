import { createStore, type StoreApi } from "zustand/vanilla";

export type TrailLocation =
  | { readonly kind: "cycles" }
  | { readonly kind: "home" }
  | { readonly initiativeId: string; readonly kind: "initiative" }
  | { readonly projectId: string; readonly kind: "project" }
  | { readonly kind: "projects" }
  | { readonly kind: "search" }
  | { readonly kind: "triage" };

export interface TrailNavigationState {
  readonly location: TrailLocation;
  readonly requestId: number;
  readonly navigate: (location: TrailLocation) => void;
}

export type TrailNavigationStore = StoreApi<TrailNavigationState>;

export function createTrailNavigationStore(): TrailNavigationStore {
  return createStore<TrailNavigationState>((set) => ({
    location: { kind: "home" },
    navigate: (location) => set((state) => ({
      location,
      requestId: state.requestId + 1,
    })),
    requestId: 0,
  }));
}
