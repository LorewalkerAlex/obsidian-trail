import { describe, expect, it } from "vitest";

import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { selectTrailInitiativeInspectorReadModel } from "./trail-initiative-inspector-query";

describe("selectTrailInitiativeInspectorReadModel", () => {
  it("projects the readable Initiative and shared configuration without inventing detail state", () => {
    const state = createTrailTestRuntimeStore().getState();

    const readModel = selectTrailInitiativeInspectorReadModel(state, "initiative-a");

    expect(readModel).not.toBeNull();
    expect(readModel?.title).toBe("Initiative A");
    expect(readModel?.expectedInitiative).toEqual({
      id: "initiative-a",
      labelIds: [],
      title: "Initiative A",
    });
    expect(readModel?.configuration.temporal.timezone).toBe("Asia/Singapore");
    expect(readModel).not.toHaveProperty("description");
    expect(readModel).not.toHaveProperty("status");
  });

  it("returns null when the target Initiative is not readable", () => {
    const state = createTrailTestRuntimeStore().getState();

    expect(selectTrailInitiativeInspectorReadModel(state, "initiative-missing")).toBeNull();
  });
});
