import type {
  TrailMutationActionResult,
  TrailMutationReceipt,
} from "../../application/trail-application-support";
import type { TrailPlanningInputRequest } from "../../domain/planning/trail-plan-result";

export function trailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Trail error.";
}

export function observeTrailActionCompletion(
  receipt: TrailMutationReceipt,
  onError: (message: string | undefined) => void,
): void {
  onError(undefined);
  void receipt.completion.catch((error: unknown) => {
    onError(trailErrorMessage(error));
  });
}

export function runTrailReceipt<TReceipt extends TrailMutationReceipt>(
  action: () => TReceipt,
  onError: (message: string | undefined) => void,
  onAccepted?: (receipt: TReceipt) => void,
): TReceipt | undefined {
  try {
    const receipt = action();
    onAccepted?.(receipt);
    observeTrailActionCompletion(receipt, onError);
    return receipt;
  } catch (error: unknown) {
    onError(trailErrorMessage(error));
    return undefined;
  }
}

/**
 * Handles the Application PlanResult projection without teaching pages about
 * planner internals. NeedsInput stays explicit so the owning interaction can
 * render the right input control instead of converting it into an error.
 */
export function runTrailMutationAction(
  action: () => TrailMutationActionResult,
  input: {
    readonly onError: (message: string | undefined) => void;
    readonly onNeedsInput?: (request: TrailPlanningInputRequest) => void;
    readonly onSettled?: () => void;
  },
): TrailMutationActionResult | undefined {
  try {
    const result = action();
    input.onError(undefined);
    switch (result.kind) {
      case "submitted":
        observeTrailActionCompletion(result.receipt, input.onError);
        input.onSettled?.();
        break;
      case "unchanged":
        input.onSettled?.();
        break;
      case "needs-input":
        input.onNeedsInput?.(result.input);
        break;
    }
    return result;
  } catch (error: unknown) {
    input.onError(trailErrorMessage(error));
    return undefined;
  }
}
