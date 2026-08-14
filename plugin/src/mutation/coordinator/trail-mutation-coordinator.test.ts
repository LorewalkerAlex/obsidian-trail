import { describe, expect, it } from "vitest";

import {
  createTrailMutationPlan,
  projectMutationEntity,
} from "../plans/trail-mutation-plan";
import { TrailMutationQueue } from "../queue/trail-mutation-queue";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { submitTrailMutation } from "./trail-mutation-coordinator";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
} as const;

function plan() {
  return createTrailMutationPlan({
    commandId: "command-a",
    effects: [{ after: projectMutationEntity(project), kind: "create" }],
    intent: "project.create",
  });
}

describe("Trail Mutation Coordinator", () => {
  it("publishes pending state synchronously and removes it only after settle", async () => {
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const completion = submitTrailMutation(store, queue, {
      execute: async () => {
        await gate;
        return project;
      },
      plan: plan(),
      queueKind: "project.create",
      settle: () => undefined,
    });

    expect(store.getState().pendingPlans).toHaveLength(1);
    release();
    await completion;
    expect(store.getState().pendingPlans).toEqual([]);
    queue.dispose();
  });

  it("recovers before removing a failed optimistic plan and maps the final error", async () => {
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const order: string[] = [];

    const completion = submitTrailMutation(store, queue, {
      execute: async () => {
        order.push("execute");
        throw new Error("write failed");
      },
      mapError: () => new Error("mapped"),
      onFailed: () => {
        order.push("failed");
      },
      plan: plan(),
      queueKind: "project.create",
      recover: async () => {
        order.push(`recover:${store.getState().pendingPlans.length}`);
      },
      settle: () => undefined,
    });

    await expect(completion).rejects.toThrow("mapped");
    expect(order).toEqual(["execute", "failed", "recover:1"]);
    expect(store.getState().pendingPlans).toEqual([]);
    queue.dispose();
  });

  it("removes optimistic state when the queue rejects before execution starts", async () => {
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    queue.dispose();

    const completion = submitTrailMutation(store, queue, {
      execute: async () => project,
      plan: plan(),
      queueKind: "project.create",
      settle: () => undefined,
    });

    expect(store.getState().pendingPlans).toHaveLength(1);
    await expect(completion).rejects.toMatchObject({ code: "queue-disposed" });
    expect(store.getState().pendingPlans).toEqual([]);
  });
});
