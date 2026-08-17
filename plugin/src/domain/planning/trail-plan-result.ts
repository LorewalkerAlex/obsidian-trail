export interface TrailPlanningInputRequest {
  readonly code: string;
  readonly message: string;
}

export interface TrailPlanningRejection {
  readonly code: string;
  readonly message: string;
}

export type TrailPlanResult<TPlan> =
  | { readonly kind: "ready"; readonly plan: TPlan }
  | { readonly input: TrailPlanningInputRequest; readonly kind: "needs-input" }
  | { readonly kind: "rejected"; readonly reason: TrailPlanningRejection };

export function readyTrailPlan<TPlan>(plan: TPlan): TrailPlanResult<TPlan> {
  return { kind: "ready", plan };
}

export function trailPlanNeedsInput<TPlan = never>(
  code: string,
  message: string,
): TrailPlanResult<TPlan> {
  return { input: { code, message }, kind: "needs-input" };
}

export function rejectTrailPlan<TPlan = never>(
  code: string,
  message: string,
): TrailPlanResult<TPlan> {
  return { kind: "rejected", reason: { code, message } };
}
