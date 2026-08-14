import {
  isTrailMutationPlan,
  type TrailMutationPlan,
} from "../mutation/plans/trail-mutation-plan";
import { addTrailPendingPlan } from "../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import {
  toTrailMutationPlan as toTriageMutationPlan,
  type TriageMutationPlan,
} from "./trail-triage-plan";
import {
  toTrailMutationPlan as toWorkflowMutationPlan,
  type WorkflowMutationPlan,
} from "./trail-workflow-plan";

export * from "../runtime/control/trail-runtime-control";
export * from "../runtime/indexes/trail-runtime-indexes";
export * from "../runtime/ownership/trail-source-ownership";
export * from "../runtime/projection/trail-runtime-projection";
export * from "../runtime/reconcile/trail-runtime-reconciler";
export * from "../runtime/store/trail-runtime-store";

export type TrailPendingPlan = TrailMutationPlan;

/**
 * Compatibility entrypoint while existing feature planners still return their
 * execution-specific plan shape. Canonical Runtime only stores logical plans.
 */
export function addPendingPlan(
  store: TrailRuntimeStore,
  plan: TrailMutationPlan | TriageMutationPlan | WorkflowMutationPlan,
): void {
  if (isTrailMutationPlan(plan)) {
    addTrailPendingPlan(store, plan);
    return;
  }

  if (
    plan.kind === "create-triage-issue"
    || plan.kind === "update-triage-issue"
    || plan.kind === "delete-triage-issue"
  ) {
    addTrailPendingPlan(store, toTriageMutationPlan(plan));
    return;
  }

  addTrailPendingPlan(store, toWorkflowMutationPlan(plan));
}
