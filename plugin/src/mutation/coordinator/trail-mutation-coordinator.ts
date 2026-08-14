import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnosticData,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  addTrailPendingPlan,
  removePendingPlan,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailMutationPlan } from "../plans/trail-mutation-plan";
import type { TrailMutationQueue } from "../queue/trail-mutation-queue";

export interface TrailCoordinatedMutation<Result> {
  readonly execute: () => Promise<Result>;
  readonly mapError?: (error: unknown) => unknown;
  readonly onCommitted?: (result: Result) => void | Promise<void>;
  readonly onFailed?: (error: unknown) => void | Promise<void>;
  readonly optimisticData?: TrailDiagnosticData;
  readonly plan: TrailMutationPlan;
  readonly queueKind: string;
  readonly recover?: (error: unknown) => Promise<void>;
  readonly settle: (result: Result) => void | Promise<void>;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

async function runLifecycleHook(
  hook: (() => void | Promise<void>) | undefined,
  hookName: string,
  correlationId: string,
  queueKind: string,
  diagnostics: TrailDiagnostics,
): Promise<void> {
  if (hook === undefined) return;
  try {
    await hook();
  } catch (error: unknown) {
    diagnostics.record("mutation.lifecycle-hook.failed", {
      correlationId,
      data: {
        errorName: errorName(error),
        hook: hookName,
        kind: queueKind,
      },
      level: "error",
    });
  }
}

/**
 * Owns the common optimistic lifecycle around the global serial queue. Feature
 * code supplies semantic execution, verification/reconcile, and recovery only.
 */
export function submitTrailMutation<Result>(
  store: TrailRuntimeStore,
  queue: TrailMutationQueue,
  mutation: TrailCoordinatedMutation<Result>,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): Promise<void> {
  const correlationId = mutation.plan.commandId;
  let started = false;
  let finalized = false;

  const finalizePending = (reason: "committed" | "failed"): void => {
    if (finalized) return;
    finalized = true;
    removePendingPlan(store, mutation.plan.commandId);
    diagnostics.record("runtime.optimistic.removed", {
      correlationId,
      data: {
        pendingCount: store.getState().pendingPlans.length,
        reason,
      },
      level: reason === "committed" ? "info" : "warn",
    });
  };

  addTrailPendingPlan(store, mutation.plan);
  diagnostics.record("runtime.optimistic.applied", {
    correlationId,
    data: {
      ...(mutation.optimisticData ?? {}),
      pendingCount: store.getState().pendingPlans.length,
    },
  });

  const queued = queue.enqueue(async () => {
    started = true;
    let result: Result | undefined;
    let failure: unknown;
    let committed = false;

    try {
      result = await mutation.execute();
      await mutation.settle(result);
      committed = true;
    } catch (error: unknown) {
      failure = error;
      await runLifecycleHook(
        mutation.onFailed === undefined ? undefined : () => mutation.onFailed?.(error),
        "failed",
        correlationId,
        mutation.queueKind,
        diagnostics,
      );
      if (mutation.recover !== undefined) {
        try {
          await mutation.recover(error);
        } catch (recoveryError: unknown) {
          diagnostics.record("mutation.recovery.failed", {
            correlationId,
            data: {
              errorName: errorName(recoveryError),
              kind: mutation.queueKind,
            },
            level: "error",
          });
        }
      }
    } finally {
      finalizePending(committed ? "committed" : "failed");
    }

    if (committed) {
      await runLifecycleHook(
        mutation.onCommitted === undefined
          ? undefined
          : () => mutation.onCommitted?.(result as Result),
        "committed",
        correlationId,
        mutation.queueKind,
        diagnostics,
      );
      return;
    }

    if (mutation.mapError !== undefined) {
      throw mutation.mapError(failure);
    }
    throw failure;
  }, {
    correlationId,
    kind: mutation.queueKind,
  });

  return queued.catch((error: unknown) => {
    // A queued mutation can be rejected by queue disposal before its callback runs.
    if (!started) {
      finalizePending("failed");
    }
    throw error;
  });
}
