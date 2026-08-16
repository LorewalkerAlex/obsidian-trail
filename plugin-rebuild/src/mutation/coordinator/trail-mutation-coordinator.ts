import { isTrailRuntimeWritable } from "../../runtime/control/trail-runtime-control";
import {
  addTrailPendingPlan,
  removeTrailPendingPlan,
} from "../../runtime/projection/trail-runtime-projection";
import type {
  TrailCommittedRuntime,
  TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import type { TrailMutationPlan } from "../plans/trail-mutation-plan";
import type { TrailPersistenceTransactionPlan } from "../physical/trail-persistence-transaction-plan";
import type { TrailMutationQueue } from "../queue/trail-mutation-queue";

export interface TrailMutationDriver<TResult> {
  readonly execute: (plan: TrailPersistenceTransactionPlan) => Promise<TResult>;
  readonly materialize: (
    plan: TrailMutationPlan,
    committed: TrailCommittedRuntime,
  ) => Promise<TrailPersistenceTransactionPlan>;
  readonly recover?: (error: unknown) => Promise<void>;
  readonly settle: (result: TResult) => Promise<void>;
}

export class TrailMutationGateClosedError extends Error {
  public constructor(readonly controlKind: string) {
    super(`Trail mutation gate is closed while Runtime is ${controlKind}`);
    this.name = "TrailMutationGateClosedError";
  }
}

/**
 * Owns the feature-agnostic optimistic lifecycle. Materialization occurs inside
 * the serial queue so placement always sees the latest committed Runtime.
 */
export function submitTrailMutation<TResult>(
  store: TrailRuntimeStore,
  queue: TrailMutationQueue,
  plan: TrailMutationPlan,
  driver: TrailMutationDriver<TResult>,
): Promise<TResult> {
  const control = store.getState().control;
  if (!isTrailRuntimeWritable(control)) {
    return Promise.reject(new TrailMutationGateClosedError(control.kind));
  }

  let started = false;
  let finalized = false;
  const finalize = (): void => {
    if (finalized) return;
    finalized = true;
    removeTrailPendingPlan(store, plan.commandId);
  };

  addTrailPendingPlan(store, plan);
  const queued = queue.enqueue(async () => {
    started = true;
    try {
      const physical = await driver.materialize(plan, store.getState().committed);
      const result = await driver.execute(physical);
      // Settlement publishes authoritative rereads before optimistic intent disappears.
      await driver.settle(result);
      return result;
    } catch (error: unknown) {
      if (driver.recover !== undefined) {
        try {
          await driver.recover(error);
        } catch {
          // Recovery failure is intentionally surfaced through the original mutation path;
          // Source Sync owns the resulting Runtime control/health transition.
        }
      }
      throw error;
    } finally {
      finalize();
    }
  });

  return queued.catch((error: unknown) => {
    // Queue disposal can reject a command before its callback starts.
    if (!started) finalize();
    throw error;
  });
}
