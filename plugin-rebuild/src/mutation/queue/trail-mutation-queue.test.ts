import { describe, expect, it } from "vitest";

import { TrailMutationQueue, TrailMutationQueueDisposedError } from "./trail-mutation-queue";

describe("TrailMutationQueue", () => {
  it("executes persistence work in strict FIFO order", async () => {
    const queue = new TrailMutationQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = queue.enqueue(async () => {
      events.push("first:start");
      await gate;
      events.push("first:end");
      return 1;
    });
    const second = queue.enqueue(async () => {
      events.push("second");
      return 2;
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);
    releaseFirst();
    await expect(first).resolves.toBe(1);
    await expect(second).resolves.toBe(2);
    expect(events).toEqual(["first:start", "first:end", "second"]);
  });

  it("rejects queued work on dispose without cancelling the already-running command", async () => {
    const queue = new TrailMutationQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const running = queue.enqueue(async () => { await gate; return "running"; });
    const queued = queue.enqueue(async () => "queued");
    await Promise.resolve();
    queue.dispose();
    await expect(queued).rejects.toBeInstanceOf(TrailMutationQueueDisposedError);
    release();
    await expect(running).resolves.toBe("running");
    await expect(queue.enqueue(async () => "late")).rejects.toBeInstanceOf(TrailMutationQueueDisposedError);
  });
});
