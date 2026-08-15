import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import { setTrailRuntimeControl } from "./trail-runtime-control";

describe("Trail Runtime control", () => {
  it("uses the canonical lifecycle without disturbing committed or pending state", () => {
    const store = createTrailRuntimeStore();
    const committed = store.getState().committed;
    const pending = store.getState().pending;

    expect(store.getState().control).toEqual({ kind: "loading" });

    setTrailRuntimeControl(store, { kind: "ready", timezone: "UTC" });
    expect(store.getState().control).toEqual({ kind: "ready", timezone: "UTC" });

    setTrailRuntimeControl(store, { kind: "refreshing", timezone: "UTC" });
    expect(store.getState().control).toEqual({ kind: "refreshing", timezone: "UTC" });

    setTrailRuntimeControl(store, {
      kind: "read-only-error",
      message: "source unavailable",
      timezone: "UTC",
    });
    expect(store.getState().control).toEqual({
      kind: "read-only-error",
      message: "source unavailable",
      timezone: "UTC",
    });
    expect(store.getState().committed).toBe(committed);
    expect(store.getState().pending).toBe(pending);
  });
});
