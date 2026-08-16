export type TrailRuntimeControl =
  | { readonly kind: "loading" }
  | { readonly kind: "ready" }
  | { readonly kind: "refreshing" }
  | { readonly kind: "read-only-error"; readonly message: string };

export function isTrailRuntimeWritable(control: TrailRuntimeControl): boolean {
  return control.kind === "ready";
}
