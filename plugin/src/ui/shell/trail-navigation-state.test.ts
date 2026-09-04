import { describe, expect, it } from "vitest";

import {
  createTrailNavigationStore,
  trailLocationsEqual,
} from "./trail-navigation-state";

describe("Trail navigation state", () => {
  it("starts on Home with normal Sidebar navigation", () => {
    const store = createTrailNavigationStore();

    expect(store.getState().location).toEqual({ kind: "home" });
    expect(store.getState().sidebarMode).toBe("navigation");
  });

  it("keeps Sidebar Search orthogonal to the host-restored Page location", () => {
    const store = createTrailNavigationStore({ kind: "projects" });

    store.getState().openSearch();
    expect(store.getState().location).toEqual({ kind: "projects" });
    expect(store.getState().sidebarMode).toBe("search");

    store.getState().restore({ kind: "project", projectId: "project-a" });
    expect(store.getState().location).toEqual({
      kind: "project",
      projectId: "project-a",
    });
    expect(store.getState().sidebarMode).toBe("search");

    store.getState().closeSearch();
    expect(store.getState().location).toEqual({
      kind: "project",
      projectId: "project-a",
    });
    expect(store.getState().sidebarMode).toBe("navigation");
  });

  it("compares identity-bearing Page locations by stable entity identity", () => {
    expect(trailLocationsEqual(
      { kind: "issue", issueId: "issue-a" },
      { kind: "issue", issueId: "issue-a" },
    )).toBe(true);
    expect(trailLocationsEqual(
      { kind: "cycle", cycleId: "cycle-a" },
      { kind: "cycle", cycleId: "cycle-b" },
    )).toBe(false);
  });
});
