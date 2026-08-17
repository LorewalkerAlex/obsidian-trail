import { describe, expect, it, vi } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { TrailMutationQueue } from "../queue/trail-mutation-queue";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { setTrailRuntimeControl } from "../../runtime/store/trail-runtime-store";
import {
  submitTrailMutation,
  TrailMutationGateClosedError,
} from "./trail-mutation-coordinator";

function plan(commandId = "command-a") {
  return createTrailMutationPlan({
    commandId,
    effects: [{
      after: {
        kind: "project",
        value: {
          id: `project-${commandId}`,
          labelIds: [],
          statusDefinitionId: "project-unstarted",
          title: "Project",
        },
      },
      kind: "create-entity",
    }],
    intent: "project-create",
  });
}

describe("Trail mutation coordinator", () => {
  it("applies optimistic intent immediately and removes it only after settlement", async () => {
    const store = createTrailRuntimeStore();
    setTrailRuntimeControl(store, { kind: "ready" });
    const queue = new TrailMutationQueue();
    const settledPendingCounts: number[] = [];
    const promise = submitTrailMutation(store, queue, plan(), {
      execute: async () => "done",
      materialize: async (logical) => ({
        commandId: logical.commandId,
        intent: logical.intent,
        kind: "single",
        operations: [],
      }),
      settle: async () => { settledPendingCounts.push(store.getState().pending.length); },
    });
    expect(store.getState().pending).toHaveLength(1);
    await expect(promise).resolves.toBe("done");
    expect(settledPendingCounts).toEqual([1]);
    expect(store.getState().pending).toHaveLength(0);
  });

  it("materializes at dequeue time against the latest committed revision", async () => {
    const store = createTrailRuntimeStore();
    setTrailRuntimeControl(store, { kind: "ready" });
    const queue = new TrailMutationQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const blocker = queue.enqueue(async () => { await gate; });
    const seenRevisions: number[] = [];

    const submitted = submitTrailMutation(store, queue, plan("late"), {
      execute: async () => undefined,
      materialize: async (logical, committed) => {
        seenRevisions.push(committed.revision);
        return { commandId: logical.commandId, intent: logical.intent, kind: "single", operations: [] };
      },
      settle: async () => undefined,
    });
    store.setState((state) => ({
      committed: { ...state.committed, revision: state.committed.revision + 1 },
    }));
    release();
    await blocker;
    await submitted;
    expect(seenRevisions).toEqual([1]);
  });

  it("removes optimistic state when execution fails and invokes recovery once", async () => {
    const store = createTrailRuntimeStore();
    setTrailRuntimeControl(store, { kind: "ready" });
    const recoveredPendingCounts: number[] = [];
    const recover = vi.fn(async () => {
      recoveredPendingCounts.push(store.getState().pending.length);
    });
    await expect(submitTrailMutation(store, new TrailMutationQueue(), plan(), {
      execute: async () => { throw new Error("boom"); },
      materialize: async (logical) => ({
        commandId: logical.commandId,
        intent: logical.intent,
        kind: "single",
        operations: [],
      }),
      recover,
      settle: async () => undefined,
    })).rejects.toThrow("boom");
    expect(recover).toHaveBeenCalledTimes(1);
    expect(recoveredPendingCounts).toEqual([0]);
    expect(store.getState().pending).toHaveLength(0);
  });

  it("rejects already-queued optimistic work if the gate closes before dequeue", async () => {
    const store = createTrailRuntimeStore();
    setTrailRuntimeControl(store, { kind: "ready" });
    const queue = new TrailMutationQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const blocker = queue.enqueue(async () => { await gate; });
    const recover = vi.fn(async () => undefined);
    const submitted = submitTrailMutation(store, queue, plan("queued"), {
      execute: async () => undefined,
      materialize: async (logical) => ({
        commandId: logical.commandId,
        intent: logical.intent,
        kind: "single",
        operations: [],
      }),
      recover,
      settle: async () => undefined,
    });
    expect(store.getState().pending).toHaveLength(1);
    setTrailRuntimeControl(store, { kind: "refreshing" });
    release();
    await blocker;
    await expect(submitted).rejects.toBeInstanceOf(TrailMutationGateClosedError);
    expect(recover).not.toHaveBeenCalled();
    expect(store.getState().pending).toEqual([]);
  });

  it("does not create pending optimistic state while the mutation gate is closed", async () => {
    const store = createTrailRuntimeStore();
    await expect(submitTrailMutation(store, new TrailMutationQueue(), plan(), {
      execute: async () => undefined,
      materialize: async () => { throw new Error("not reached"); },
      settle: async () => undefined,
    })).rejects.toBeInstanceOf(TrailMutationGateClosedError);
    expect(store.getState().pending).toHaveLength(0);
  });
});
