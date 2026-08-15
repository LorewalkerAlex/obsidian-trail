import type { TrailRuntimeStore } from "../store/trail-runtime-store";

export type TrailRuntimeControl =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly timezone: string }
  | { readonly kind: "refreshing"; readonly timezone: string }
  | {
      readonly kind: "read-only-error";
      readonly message: string;
      readonly timezone?: string;
    };

/** Publishes Runtime lifecycle control independently from committed facts and pending intent. */
export function setTrailRuntimeControl(
  store: TrailRuntimeStore,
  control: TrailRuntimeControl,
): void {
  store.setState({ control });
}
