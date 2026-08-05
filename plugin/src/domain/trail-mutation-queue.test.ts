import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  TrailTask,
  TrailTaskStatus,
} from "./trail-model";
import {
  TrailMutationQueue,
  TrailMutationQueueError,
} from "./trail-mutation-queue";
import type { TrailTaskStatusMutationInput } from "./trail-mutation-service";

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
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

function createTask(
  id: string,
  title: string,
  status: TrailTaskStatus,
): TrailTask {
  const projectPath =
    "Trail/Areas/Work/Trail POC.md";

  return {
    id,
    projectId: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
    projectPath,
    title,
    status,
    priority: "medium",
    created: "2026-08-05T09:00:00+08:00",
    labels: [],
    subtasks: [],
    notes: [],
    source: {
      filePath: projectPath,
      startOffset: 0,
      endOffset: 100,
      fingerprint: `fingerprint:${id}:${status}`,
    },
  };
}

function createInput(
  expectedTask: TrailTask,
  targetStatus: TrailTaskStatus,
): TrailTaskStatusMutationInput {
  return {
    expectedTask,
    targetStatus,
  };
}

const firstTask = createTask(
  "8c774a86-54aa-48d3-9010-99372d0738fc",
  "First task",
  "todo",
);

const secondTask = createTask(
  "fa3b3a46-f818-416a-9dd0-59aa168bc467",
  "Second task",
  "doing",
);

describe("Trail mutation queue", () => {
  it("executes mutations one at a time in enqueue order", async () => {
    const firstRun = deferred<TrailTask>();
    const secondRun = deferred<TrailTask>();
    const executeTaskStatus = vi.fn()
      .mockReturnValueOnce(firstRun.promise)
      .mockReturnValueOnce(secondRun.promise);
    const queue = new TrailMutationQueue(
      executeTaskStatus,
    );
    const firstInput = createInput(
      firstTask,
      "doing",
    );
    const secondInput = createInput(
      secondTask,
      "todo",
    );

    const firstResult =
      queue.enqueueTaskStatus(firstInput);
    const secondResult =
      queue.enqueueTaskStatus(secondInput);

    expect(executeTaskStatus).toHaveBeenCalledOnce();
    expect(executeTaskStatus).toHaveBeenNthCalledWith(
      1,
      firstInput,
    );

    const updatedFirstTask = {
      ...firstTask,
      status: "doing" as const,
    };

    firstRun.resolve(updatedFirstTask);

    await expect(firstResult).resolves.toBe(
      updatedFirstTask,
    );
    expect(executeTaskStatus).toHaveBeenCalledTimes(2);
    expect(executeTaskStatus).toHaveBeenNthCalledWith(
      2,
      secondInput,
    );

    const updatedSecondTask = {
      ...secondTask,
      status: "todo" as const,
    };

    secondRun.resolve(updatedSecondTask);

    await expect(secondResult).resolves.toBe(
      updatedSecondTask,
    );
  });

  it("continues with the next mutation after a failure", async () => {
    const failure = new Error(
      "The task changed after it was read.",
    );
    const updatedSecondTask = {
      ...secondTask,
      status: "todo" as const,
    };
    const executeTaskStatus = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(updatedSecondTask);
    const queue = new TrailMutationQueue(
      executeTaskStatus,
    );

    const failedResult = queue.enqueueTaskStatus(
      createInput(firstTask, "doing"),
    );
    const successfulResult = queue.enqueueTaskStatus(
      createInput(secondTask, "todo"),
    );

    await expect(failedResult).rejects.toBe(failure);
    await expect(successfulResult).resolves.toBe(
      updatedSecondTask,
    );

    expect(executeTaskStatus).toHaveBeenCalledTimes(2);
  });

  it("rejects queued work when disposed", async () => {
    const activeRun = deferred<TrailTask>();
    const executeTaskStatus = vi.fn(
      () => activeRun.promise,
    );
    const queue = new TrailMutationQueue(
      executeTaskStatus,
    );

    const activeResult = queue.enqueueTaskStatus(
      createInput(firstTask, "doing"),
    );
    const queuedResult = queue.enqueueTaskStatus(
      createInput(secondTask, "todo"),
    );
    const queuedRejection = expect(
      queuedResult,
    ).rejects.toMatchObject({
      code: "queue-disposed",
    });

    queue.dispose();

    await queuedRejection;
    expect(executeTaskStatus).toHaveBeenCalledOnce();

    const updatedFirstTask = {
      ...firstTask,
      status: "doing" as const,
    };

    activeRun.resolve(updatedFirstTask);

    await expect(activeResult).resolves.toBe(
      updatedFirstTask,
    );
    await expect(
      queue.enqueueTaskStatus(
        createInput(secondTask, "todo"),
      ),
    ).rejects.toBeInstanceOf(
      TrailMutationQueueError,
    );
  });
});
