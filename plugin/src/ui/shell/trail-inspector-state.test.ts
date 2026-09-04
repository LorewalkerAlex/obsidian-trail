import { describe, expect, it, vi } from "vitest";

import {
  createTrailInspectorStore,
  trailInspectorTargetForLocation,
  trailInspectorTargetsEqual,
} from "./trail-inspector-state";

describe("Trail inspector state", () => {
  it("maps only stable entity locations to Inspector targets", () => {
    expect(trailInspectorTargetForLocation({ kind: "home" })).toBeNull();
    expect(trailInspectorTargetForLocation({ kind: "triage" })).toBeNull();
    expect(trailInspectorTargetForLocation({ kind: "projects" })).toBeNull();
    expect(trailInspectorTargetForLocation({ kind: "cycles" })).toBeNull();
    expect(trailInspectorTargetForLocation({ kind: "foundation" })).toBeNull();

    expect(trailInspectorTargetForLocation({
      initiativeId: "initiative-a",
      kind: "initiative",
    })).toEqual({ initiativeId: "initiative-a", kind: "initiative" });
    expect(trailInspectorTargetForLocation({
      projectId: "project-a",
      kind: "project",
    })).toEqual({ projectId: "project-a", kind: "project" });
    expect(trailInspectorTargetForLocation({
      issueId: "issue-a",
      kind: "issue",
    })).toEqual({ issueId: "issue-a", kind: "issue" });
    expect(trailInspectorTargetForLocation({
      cycleId: "cycle-a",
      kind: "cycle",
    })).toEqual({ cycleId: "cycle-a", kind: "cycle" });
  });

  it("compares targets by stable identity", () => {
    expect(trailInspectorTargetsEqual(null, null)).toBe(true);
    expect(trailInspectorTargetsEqual(
      { kind: "project", projectId: "project-a" },
      { kind: "project", projectId: "project-a" },
    )).toBe(true);
    expect(trailInspectorTargetsEqual(
      { kind: "project", projectId: "project-a" },
      { kind: "project", projectId: "project-b" },
    )).toBe(false);
    expect(trailInspectorTargetsEqual(
      { kind: "project", projectId: "project-a" },
      { issueId: "project-a", kind: "issue" },
    )).toBe(false);
  });

  it("notifies consumers only when the target identity changes", () => {
    const store = createTrailInspectorStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.getState().restore({ kind: "project", projectId: "project-a" });
    store.getState().restore({ kind: "project", projectId: "project-a" });
    store.getState().restore(null);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().target).toBeNull();
  });
});
