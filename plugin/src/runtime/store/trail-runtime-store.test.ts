import { describe, expect, it } from "vitest";

import {
  createTrailRuntimeStore,
  selectSourceIssuesForPath,
  setTrailRuntimeWorkspaceState,
} from "./trail-runtime-store";

describe("Trail Runtime store foundation", () => {
  it(
    "initializes the frozen Core Entity and Workspace State shape without enabling deferred behavior",
    () => {
      const committed = createTrailRuntimeStore().getState().committed;

      expect(committed.initiativesById).toEqual({});
      expect(committed.milestonesById).toEqual({});
      expect(committed.cyclesById).toEqual({});
      expect(committed.workspaceState).toBeNull();
    },
  );

  it("publishes authoritative Workspace State independently from UI-local state", () => {
    const store = createTrailRuntimeStore();
    const workspaceState = {
      customViews: [],
      favorites: [],
      home: {},
    } as const;

    setTrailRuntimeWorkspaceState(store, workspaceState);

    expect(store.getState().committed.workspaceState).toBe(workspaceState);
    expect(store.getState().committed.revision).toBe(1);
  });

  it("reuses one immutable empty source-issue snapshot for missing paths", () => {
    const store = createTrailRuntimeStore();

    const first = selectSourceIssuesForPath(
      store.getState(),
      "Trail/Collections/Triage.md",
    );

    expect(first).toEqual([]);
    expect(selectSourceIssuesForPath(
      store.getState(),
      "Trail/Collections/Triage.md",
    )).toBe(first);
    expect(selectSourceIssuesForPath(store.getState(), undefined)).toBe(first);
  });
});
