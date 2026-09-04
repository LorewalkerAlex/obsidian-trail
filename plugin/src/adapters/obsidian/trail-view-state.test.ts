import { describe, expect, it } from "vitest";

import { createTrailViewState, readTrailViewState } from "./trail-view-state";

describe("Trail view state", () => {
  it("round-trips stable Product Page locations through host view state", () => {
    expect(readTrailViewState(createTrailViewState({ kind: "triage" }))).toEqual({
      location: { kind: "triage" },
    });
    expect(readTrailViewState({
      location: { kind: "issue", issueId: "issue-1" },
    })).toEqual({
      location: { kind: "issue", issueId: "issue-1" },
    });
    expect(readTrailViewState({
      location: { cycleId: "cycle-1", kind: "cycle" },
    })).toEqual({
      location: { cycleId: "cycle-1", kind: "cycle" },
    });
  });

  it("does not restore legacy Sidebar Search as a Main View location", () => {
    expect(readTrailViewState({ location: { kind: "search" } })).toEqual({
      location: { kind: "home" },
    });
  });

  it("gates Foundation host state to development builds", () => {
    expect(createTrailViewState(
      { kind: "foundation" },
      { allowDevelopment: false },
    )).toEqual({ location: { kind: "home" } });
    expect(readTrailViewState(
      { location: { kind: "foundation" } },
      { allowDevelopment: false },
    )).toEqual({ location: { kind: "home" } });
    expect(readTrailViewState(
      { location: { kind: "foundation" } },
      { allowDevelopment: true },
    )).toEqual({ location: { kind: "foundation" } });
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
