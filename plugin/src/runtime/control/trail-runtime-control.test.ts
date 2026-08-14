import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import { setTrailRuntimeAvailability } from "./trail-runtime-control";

describe("Trail Runtime control", () => {
  it("changes control state without disturbing committed or pending state", () => {
    const store = createTrailRuntimeStore();
    const committed = store.getState().committed;
    const pending = store.getState().pendingPlans;

    setTrailRuntimeAvailability(store, { kind: "ready", timezone: "UTC" });

    expect(store.getState().availability).toEqual({ kind: "ready", timezone: "UTC" });
    expect(store.getState().committed).toBe(committed);
    expect(store.getState().pendingPlans).toBe(pending);
  });
});
