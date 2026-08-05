import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  executeTrailCrossFileMutation,
  TrailCrossFileMutationError,
} from "./trail-cross-file-mutation";
import { TrailMutationQueue } from "./trail-mutation-queue";

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
}

interface CreatedTarget {
  id: string;
}

function deferred<Value>(): Deferred<Value> {
  let resolvePromise:
    | ((value: Value) => void)
    | undefined;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => {
      if (!resolvePromise) {
        throw new Error("Deferred promise is not ready.");
      }

      resolvePromise(value);
    },
  };
}

describe("Trail cross-file mutation", () => {
  it("creates the target before removing the source", async () => {
    const calls: string[] = [];
    const target: CreatedTarget = { id: "task-1" };

    const result = await executeTrailCrossFileMutation({
      createTarget: async () => {
        calls.push("create-target");
        return target;
      },
      removeSource: async () => {
        calls.push("remove-source");
      },
      compensateTarget: async () => {
        calls.push("compensate-target");
      },
    });

    expect(result).toBe(target);
    expect(calls).toEqual([
      "create-target",
      "remove-source",
    ]);
  });

  it("stops before source removal when target creation fails", async () => {
    const failure = new Error("Target write failed.");
    const removeSource = vi.fn(
      () => Promise.resolve(),
    );
    const compensateTarget = vi.fn(
      () => Promise.resolve(),
    );

    await expect(
      executeTrailCrossFileMutation({
        createTarget: () => Promise.reject(failure),
        removeSource,
        compensateTarget,
      }),
    ).rejects.toMatchObject({
      code: "target-create-failed",
      outcome: "unchanged",
      cause: failure,
    });

    expect(removeSource).not.toHaveBeenCalled();
    expect(compensateTarget).not.toHaveBeenCalled();
  });

  it("compensates the target when source removal fails", async () => {
    const target: CreatedTarget = { id: "task-2" };
    const failure = new Error("Source write failed.");
    const compensateTarget = vi.fn(
      () => Promise.resolve(),
    );

    await expect(
      executeTrailCrossFileMutation({
        createTarget: () => Promise.resolve(target),
        removeSource: () => Promise.reject(failure),
        compensateTarget,
      }),
    ).rejects.toMatchObject({
      code: "source-remove-failed",
      outcome: "compensated",
      cause: failure,
      targetResult: target,
    });

    expect(compensateTarget).toHaveBeenCalledOnce();
    expect(compensateTarget).toHaveBeenCalledWith(target);
  });

  it("reports a partial result when compensation also fails", async () => {
    const target: CreatedTarget = { id: "task-3" };
    const sourceFailure = new Error(
      "Source write failed.",
    );
    const compensationFailure = new Error(
      "Compensation failed.",
    );

    const error = await captureError(
      () => executeTrailCrossFileMutation({
        createTarget: () => Promise.resolve(target),
        removeSource: () => Promise.reject(sourceFailure),
        compensateTarget: () => Promise.reject(
          compensationFailure,
        ),
      }),
    );

    expect(error).toBeInstanceOf(
      TrailCrossFileMutationError,
    );
    expect(error).toMatchObject({
      code: "compensation-failed",
      outcome: "partial",
      cause: sourceFailure,
      targetResult: target,
      compensationCause: compensationFailure,
    });
  });

  it("keeps every file step inside one queue command", async () => {
    const sourceStarted = deferred<void>();
    const sourceRemoval = deferred<void>();
    const target: CreatedTarget = { id: "task-4" };
    const nextCommand = vi.fn(
      () => Promise.resolve("next result"),
    );
    const queue = new TrailMutationQueue();
    const mutationResult = queue.enqueue(
      () => executeTrailCrossFileMutation({
        createTarget: () => Promise.resolve(target),
        removeSource: () => {
          sourceStarted.resolve(undefined);
          return sourceRemoval.promise;
        },
        compensateTarget: () => Promise.resolve(),
      }),
    );
    const nextResult = queue.enqueue(nextCommand);

    await sourceStarted.promise;
    expect(nextCommand).not.toHaveBeenCalled();

    sourceRemoval.resolve(undefined);

    await expect(mutationResult).resolves.toBe(target);
    await expect(nextResult).resolves.toBe("next result");
    expect(nextCommand).toHaveBeenCalledOnce();
  });
});

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected the mutation to fail.");
}
