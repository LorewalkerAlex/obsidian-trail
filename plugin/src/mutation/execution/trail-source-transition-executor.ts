import type {
  TrailSourceTransitionPlan,
} from "../physical/trail-source-transition-plan";
import type { TrailSingleTransactionPlan } from "../physical/trail-single-transaction-plan";

/**
 * `present` means the observer verified that the persisted object is in a state
 * where the transition's one bounded target compensation remains safe.
 */
export type TrailTransitionObservation<T> =
  | { readonly kind: "absent"; readonly value: T }
  | { readonly kind: "present"; readonly value: T }
  | { readonly kind: "unsafe" };

export interface TrailSourceTransitionDriver<TTarget, TSource> {
  readonly compensateTarget?: (
    plan: TrailSingleTransactionPlan,
  ) => Promise<TTarget>;
  readonly executeSource: (
    plan: TrailSingleTransactionPlan,
  ) => Promise<TSource>;
  readonly executeTarget: (
    plan: TrailSingleTransactionPlan,
  ) => Promise<TTarget>;
  readonly observeSource: (
    plan: TrailSingleTransactionPlan,
  ) => Promise<TrailTransitionObservation<TSource>>;
  readonly observeTarget: (
    plan: TrailSingleTransactionPlan,
  ) => Promise<TrailTransitionObservation<TTarget>>;
  readonly preflight: (plan: TrailSourceTransitionPlan) => Promise<void>;
}

export type TrailSourceTransitionOutcome<TTarget, TSource> =
  | {
      readonly kind: "committed";
      readonly recovered: boolean;
      readonly source: TSource;
      readonly target: TTarget;
    }
  | {
      readonly error: unknown;
      readonly kind: "unchanged";
    }
  | {
      readonly error: unknown;
      readonly kind: "compensated";
      readonly recovered: boolean;
      readonly source?: TSource;
      readonly target: TTarget;
    }
  | {
      readonly error: unknown;
      readonly kind: "partial";
    };

async function safeObserve<T>(
  observer: () => Promise<TrailTransitionObservation<T>>,
): Promise<TrailTransitionObservation<T>> {
  try {
    return await observer();
  } catch {
    return { kind: "unsafe" };
  }
}

async function compensate<TTarget, TSource>(
  plan: TrailSourceTransitionPlan,
  driver: TrailSourceTransitionDriver<TTarget, TSource>,
  originalError: unknown,
  source: TSource | undefined,
): Promise<TrailSourceTransitionOutcome<TTarget, TSource>> {
  const compensation = plan.compensation;
  if (compensation === undefined || driver.compensateTarget === undefined) {
    return { error: originalError, kind: "partial" };
  }

  try {
    const target = await driver.compensateTarget(compensation);
    return {
      error: originalError,
      kind: "compensated",
      recovered: false,
      source,
      target,
    };
  } catch (compensationError: unknown) {
    const target = await safeObserve(() => driver.observeTarget(plan.target));
    if (target.kind === "absent") {
      return {
        error: originalError,
        kind: "compensated",
        recovered: true,
        source,
        target: target.value,
      };
    }
    return { error: compensationError, kind: "partial" };
  }
}

/**
 * Owns the V1 cross-source ordering contract: verified target first, destructive
 * source second, then at most one safe target compensation when convergence fails.
 */
export async function executeTrailSourceTransition<TTarget, TSource>(
  plan: TrailSourceTransitionPlan,
  driver: TrailSourceTransitionDriver<TTarget, TSource>,
): Promise<TrailSourceTransitionOutcome<TTarget, TSource>> {
  try {
    await driver.preflight(plan);
  } catch (error: unknown) {
    return { error, kind: "unchanged" };
  }

  let target: TTarget;
  try {
    target = await driver.executeTarget(plan.target);
  } catch (error: unknown) {
    const observedTarget = await safeObserve(() => driver.observeTarget(plan.target));
    if (observedTarget.kind === "absent") {
      return { error, kind: "unchanged" };
    }
    if (observedTarget.kind === "present") {
      return compensate(plan, driver, error, undefined);
    }
    return { error, kind: "partial" };
  }

  try {
    const source = await driver.executeSource(plan.source);
    return {
      kind: "committed",
      recovered: false,
      source,
      target,
    };
  } catch (error: unknown) {
    const observedSource = await safeObserve(() => driver.observeSource(plan.source));
    if (observedSource.kind === "absent") {
      return {
        kind: "committed",
        recovered: true,
        source: observedSource.value,
        target,
      };
    }
    if (observedSource.kind === "present") {
      return compensate(plan, driver, error, observedSource.value);
    }
    return { error, kind: "partial" };
  }
}
