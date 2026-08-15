import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createTrailDiagnostics,
  type TrailDiagnosticPersistence,
} from "../../diagnostics/trail-diagnostics";
import {
  TrailMutationQueue,
  TrailMutationQueueError,
} from "./trail-mutation-queue";

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

function createDiagnosticHarness() {
  const lines: string[] = [];
  const persistence: TrailDiagnosticPersistence = {
    appendLine: async (line) => {
      lines.push(line);
    },
    beginSession: async () => undefined,
    readRecentSessions: async () => lines.join(""),
    replaceSession: async () => undefined,
  };
  const diagnostics = createTrailDiagnostics({
    createId: () => "session-a",
    now: () => 1,
    persistence,
  });

  return { diagnostics, lines };
}

interface ParsedQueueDiagnosticEvent {
  readonly correlationId?: string;
  readonly name: string;
}

function parseQueueDiagnosticEvent(line: string): ParsedQueueDiagnosticEvent {
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Diagnostic line is not an object");
  }

  const record = parsed as Record<string, unknown>;
  if (typeof record.name !== "string") {
    throw new Error("Diagnostic line is missing an event name");
  }

  return {
    correlationId: typeof record.correlationId === "string"
      ? record.correlationId
      : undefined,
    name: record.name,
  };
}

describe("Trail mutation queue", () => {
  it("executes commands one at a time in enqueue order", async () => {
    const firstRun = deferred<string>();
    const secondRun = deferred<number>();
    const firstCommand = vi.fn(
      () => firstRun.promise,
    );
    const secondCommand = vi.fn(
      () => secondRun.promise,
    );
    const queue = new TrailMutationQueue();
    const firstResult = queue.enqueue(firstCommand);
    const secondResult = queue.enqueue(secondCommand);

    expect(firstCommand).toHaveBeenCalledOnce();
    expect(secondCommand).not.toHaveBeenCalled();

    firstRun.resolve("first result");
    await expect(firstResult).resolves.toBe(
      "first result",
    );
    expect(secondCommand).toHaveBeenCalledOnce();

    secondRun.resolve(42);

    await expect(secondResult).resolves.toBe(42);
  });

  it("continues with the next command after a failure", async () => {
    const failure = new Error(
      "The task changed after it was read.",
    );
    const failedCommand = vi.fn(
      () => Promise.reject(failure),
    );
    const successfulCommand = vi.fn(
      () => Promise.resolve("updated"),
    );
    const queue = new TrailMutationQueue();
    const failedResult = queue.enqueue(failedCommand);
    const successfulResult = queue.enqueue(
      successfulCommand,
    );

    await expect(failedResult).rejects.toBe(failure);
    await expect(successfulResult).resolves.toBe(
      "updated",
    );

    expect(failedCommand).toHaveBeenCalledOnce();
    expect(successfulCommand).toHaveBeenCalledOnce();
  });

  it("rejects queued work when disposed", async () => {
    const activeRun = deferred<string>();
    const activeCommand = vi.fn(
      () => activeRun.promise,
    );
    const queuedCommand = vi.fn(
      () => Promise.resolve("queued result"),
    );
    const queue = new TrailMutationQueue();
    const activeResult = queue.enqueue(activeCommand);
    const queuedResult = queue.enqueue(queuedCommand);
    const queuedRejection = expect(
      queuedResult,
    ).rejects.toMatchObject({
      code: "queue-disposed",
    });

    queue.dispose();

    await queuedRejection;
    expect(activeCommand).toHaveBeenCalledOnce();
    expect(queuedCommand).not.toHaveBeenCalled();

    activeRun.resolve("active result");

    await expect(activeResult).resolves.toBe(
      "active result",
    );
    await expect(
      queue.enqueue(
        () => Promise.resolve("late result"),
      ),
    ).rejects.toBeInstanceOf(
      TrailMutationQueueError,
    );
  });

  it("emits correlated queue lifecycle events without changing queue semantics", async () => {
    const { diagnostics, lines } = createDiagnosticHarness();
    const queue = new TrailMutationQueue(diagnostics);

    await expect(queue.enqueue(
      () => Promise.resolve("done"),
      {
        correlationId: "command-a",
        kind: "triage.capture",
      },
    )).resolves.toBe("done");
    await diagnostics.flush();

    const events = lines
      .map(parseQueueDiagnosticEvent)
      .filter((event) => event.name.startsWith("mutation.queue."));
    expect(events.map((event) => event.name)).toEqual([
      "mutation.queue.enqueued",
      "mutation.queue.started",
      "mutation.queue.completed",
    ]);
    expect(events.every((event) => event.correlationId === "command-a")).toBe(true);
  });
});
