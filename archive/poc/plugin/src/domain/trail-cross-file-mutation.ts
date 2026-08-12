export type TrailCrossFileMutationOutcome =
  | "unchanged"
  | "compensated"
  | "partial";

export type TrailCrossFileMutationErrorCode =
  | "target-create-failed"
  | "source-remove-failed"
  | "compensation-failed";

export class TrailCrossFileMutationError extends Error {
  constructor(
    readonly code: TrailCrossFileMutationErrorCode,
    readonly outcome: TrailCrossFileMutationOutcome,
    message: string,
    readonly cause?: unknown,
    readonly targetResult?: unknown,
    readonly compensationCause?: unknown,
  ) {
    super(message);
    this.name = "TrailCrossFileMutationError";
  }
}

export interface TrailCrossFileMutationOperations<
  TargetResult,
> {
  createTarget: () => Promise<TargetResult>;
  removeSource: () => Promise<void>;
  compensateTarget: (targetResult: TargetResult) => Promise<void>;
}

export async function executeTrailCrossFileMutation<
  TargetResult,
>({
  createTarget,
  removeSource,
  compensateTarget,
}: TrailCrossFileMutationOperations<TargetResult>): Promise<TargetResult> {
  let targetResult: TargetResult;

  try {
    targetResult = await createTarget();
  } catch (error: unknown) {
    throw new TrailCrossFileMutationError(
      "target-create-failed",
      "unchanged",
      "Trail could not create the target object.",
      error,
    );
  }

  try {
    await removeSource();
  } catch (sourceError: unknown) {
    try {
      await compensateTarget(targetResult);
    } catch (compensationError: unknown) {
      throw new TrailCrossFileMutationError(
        "compensation-failed",
        "partial",
        "Trail could not remove the source object, and compensating the target object also failed.",
        sourceError,
        targetResult,
        compensationError,
      );
    }

    throw new TrailCrossFileMutationError(
      "source-remove-failed",
      "compensated",
      "Trail could not remove the source object. The target object was compensated.",
      sourceError,
      targetResult,
    );
  }

  return targetResult;
}
