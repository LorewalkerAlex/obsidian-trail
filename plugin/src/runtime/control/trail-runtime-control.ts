import type { TrailRuntimeStore } from "../store/trail-runtime-store";

export type TrailRuntimeControl =
  | { readonly kind: "idle" }
  | { readonly kind: "initializing" }
  | { readonly kind: "ready"; readonly timezone: string }
  | { readonly kind: "blocked"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

/** Compatibility alias while existing UI/Application still calls this availability. */
export type TrailRuntimeAvailability = TrailRuntimeControl;

/** Runtime Control is the canonical owner of readiness / mutation-availability state. */
export function setTrailRuntimeAvailability(
  store: TrailRuntimeStore,
  availability: TrailRuntimeAvailability,
): void {
  store.setState((state) => ({
    availability,
    committed: state.committed,
    pendingPlans: state.pendingPlans,
  }));
}
