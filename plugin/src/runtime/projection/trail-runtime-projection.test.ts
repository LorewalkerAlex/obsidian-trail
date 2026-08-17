import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import {
  addTrailPendingPlan,
  projectTrailEffectiveAuthoritativeState,
  removeTrailPendingPlan,
} from "./trail-runtime-projection";

function project(title: string) {
  return {
    kind: "project" as const,
    value: {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title,
    },
  };
}

describe("Trail runtime projection", () => {
  it("replays ordered plans and rebases automatically when an earlier plan disappears", () => {
    const store = createTrailRuntimeStore();
    const create = createTrailMutationPlan({
      commandId: "one",
      effects: [{ after: project("One"), kind: "create-entity" }],
      intent: "create",
    });
    const replace = createTrailMutationPlan({
      commandId: "two",
      effects: [{ after: project("Two"), before: project("One"), kind: "replace-entity" }],
      intent: "replace",
    });

    addTrailPendingPlan(store, create);
    addTrailPendingPlan(store, replace);
    expect(projectTrailEffectiveAuthoritativeState(store.getState()).domain.projectsById.get("project-a")?.title)
      .toBe("Two");

    removeTrailPendingPlan(store, "one");
    expect(projectTrailEffectiveAuthoritativeState(store.getState()).domain.projectsById.get("project-a")?.title)
      .toBe("Two");
  });

  it("rejects duplicate pending command IDs", () => {
    const store = createTrailRuntimeStore();
    const plan = createTrailMutationPlan({
      commandId: "same",
      effects: [{ after: project("One"), kind: "create-entity" }],
      intent: "create",
    });
    addTrailPendingPlan(store, plan);
    expect(() => addTrailPendingPlan(store, plan)).toThrow(/Duplicate pending/);
  });
});
