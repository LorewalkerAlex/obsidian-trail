import { describe, expect, it } from "vitest";

import { createTrailViewState, readTrailViewState } from "./trail-view-state";

describe("Trail view state", () => {
  it("round-trips a normal Trail location through host view state", () => {
    expect(readTrailViewState(createTrailViewState({ kind: "triage" }))).toEqual({
      location: { kind: "triage" },
    });
  });

  it("preserves stable entity identity for navigable object locations", () => {
    expect(readTrailViewState({
      location: { kind: "project", projectId: "project-1" },
    })).toEqual({
      location: { kind: "project", projectId: "project-1" },
    });
  });

  it("falls back to Home for missing or invalid persisted host state", () => {
    expect(readTrailViewState(undefined)).toEqual({ location: { kind: "home" } });
    expect(readTrailViewState({ location: { kind: "project", projectId: "" } })).toEqual({
      location: { kind: "home" },
    });
    expect(readTrailViewState({ location: { kind: "unknown" } })).toEqual({
      location: { kind: "home" },
    });
  });
});
