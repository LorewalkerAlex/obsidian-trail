import type { TrailPlanResult, TrailPlanningInputRequest } from "../domain/planning/trail-plan-result";
import type { TrailPlanningState } from "../domain/planning/trail-planning-state";
import type { TrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import { projectTrailEffectiveAuthoritativeState } from "../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";

export class TrailApplicationPlanningError extends Error {
  public constructor(readonly code: string, message: string) {
    super(message);
    this.name = "TrailApplicationPlanningError";
  }
}

export class TrailApplicationUnavailableError extends Error {
  public constructor(message = "Trail authoritative state is not ready") {
    super(message);
    this.name = "TrailApplicationUnavailableError";
  }
}

export interface TrailMutationReceipt {
  readonly commandId: string;
  readonly completion: Promise<void>;
}

export interface TrailEntityMutationReceipt extends TrailMutationReceipt {
  readonly entityId: string;
}

export type TrailMutationCommandResult =
  | { readonly kind: "submitted"; readonly receipt: TrailMutationReceipt }
  | { readonly kind: "unchanged" }
  | { readonly input: TrailPlanningInputRequest; readonly kind: "needs-input" };

export type TrailMutationActionResult =
  | { readonly kind: "submitted"; readonly receipt: TrailEntityMutationReceipt }
  | { readonly entityId: string; readonly kind: "unchanged" }
  | { readonly input: TrailPlanningInputRequest; readonly kind: "needs-input" };

export function readTrailPlanningState(store: TrailRuntimeStore): TrailPlanningState {
  const runtime = store.getState();
  if (runtime.control.kind !== "ready") {
    throw new TrailApplicationUnavailableError(
      `Trail authoritative state is not writable while Runtime is ${runtime.control.kind}`,
    );
  }
  const effective = projectTrailEffectiveAuthoritativeState(runtime);
  if (effective.configuration === null || effective.workspaceState === null) {
    throw new TrailApplicationUnavailableError();
  }
  return {
    configuration: effective.configuration,
    domain: effective.domain,
    workspaceState: effective.workspaceState,
  };
}

export type TrailApplicationPlanResolution<TPlan> =
  | { readonly kind: "ready"; readonly value: TPlan }
  | { readonly input: TrailPlanningInputRequest; readonly kind: "needs-input" };

export function resolveTrailApplicationPlan<TPlan>(
  result: TrailPlanResult<TPlan>,
): TrailApplicationPlanResolution<TPlan> {
  switch (result.kind) {
    case "ready":
      return { kind: "ready", value: result.plan };
    case "needs-input":
      return { input: result.input, kind: "needs-input" };
    case "rejected":
      throw new TrailApplicationPlanningError(result.reason.code, result.reason.message);
  }
}

export function submitTrailApplicationMutationPlan(
  sourceSync: TrailAuthoritativeSourceSync,
  plan: TrailMutationPlan,
): TrailMutationReceipt {
  return {
    commandId: plan.commandId,
    completion: sourceSync.submit(plan).then(() => undefined),
  };
}

export function submitTrailApplicationPlan(
  sourceSync: TrailAuthoritativeSourceSync,
  plan: TrailMutationPlan,
  entityId: string,
): TrailEntityMutationReceipt {
  return {
    ...submitTrailApplicationMutationPlan(sourceSync, plan),
    entityId,
  };
}
