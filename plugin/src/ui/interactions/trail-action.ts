export interface TrailUiActionReceipt {
  readonly completion: Promise<void>;
}

export function trailErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Trail error.";
}

export function observeTrailActionCompletion(
  receipt: TrailUiActionReceipt,
  onError: (message: string | undefined) => void,
): void {
  onError(undefined);
  void receipt.completion.catch((error: unknown) => {
    onError(trailErrorMessage(error));
  });
}

export function runTrailAction<TReceipt extends TrailUiActionReceipt>(
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
