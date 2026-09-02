import { describe, expect, it } from "vitest";

import { createTrailNavigationStore } from "./trail-navigation-state";

describe("TrailNavigationStore", () => {
  it("counts explicit navigation requests", () => {
    const store = createTrailNavigationStore();

    store.getState().navigate({ kind: "triage" });

    expect(store.getState().location).toEqual({ kind: "triage" });
    expect(store.getState().requestId).toBe(1);
  });

  it("does not create duplicate requests for the current location", () => {
    const store = createTrailNavigationStore();
    store.getState().navigate({ kind: "triage" });

    store.getState().navigate({ kind: "triage" });

    expect(store.getState().requestId).toBe(1);
  });

  it("restores host history without creating a new navigation request", () => {
    const store = createTrailNavigationStore();
    store.getState().navigate({ kind: "triage" });

    store.getState().restore({ kind: "home" });

    expect(store.getState().location).toEqual({ kind: "home" });
    expect(store.getState().requestId).toBe(1);
  });
});
