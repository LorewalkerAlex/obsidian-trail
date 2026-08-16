import { describe, expect, it } from "vitest";

import { createDefaultTrailPluginData } from "../../domain/trail-configuration";
import {
  createTrailReloadCandidate,
  createTrailRuntimeStore,
  publishTrailReloadCandidate,
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  setTrailRuntimeConfiguration,
  setTrailRuntimeWorkspaceState,
} from "./trail-runtime-store";

describe("Trail Runtime store foundation", () => {
  it(
    "initializes the frozen Core Entity and Workspace State shape without enabling deferred behavior",
    () => {
      const committed = createTrailRuntimeStore().getState().committed;

      expect(committed.authoritative.domain.initiativesById).toEqual({});
      expect(committed.authoritative.domain.milestonesById).toEqual({});
      expect(committed.authoritative.domain.cyclesById).toEqual({});
      expect(committed.authoritative.workspaceState).toBeNull();
      expect(committed.ownership).toEqual({
        sourceByEntityId: {},
        sourceEntityIdsByPath: {},
      });
      expect(committed.indexes).toEqual({ issuesByProjectId: {} });
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

    expect(store.getState().committed.authoritative.workspaceState).toBe(workspaceState);
    expect(store.getState().committed.revision).toBe(1);
  });

  it("atomically publishes a validated reload candidate with a monotonic live revision", () => {
    const live = createTrailRuntimeStore();
    const staging = createTrailRuntimeStore();
    let id = 0;
    const pluginData = createDefaultTrailPluginData({
      createId: () => `status-${id += 1}`,
      timezone: "Asia/Singapore",
    });

    setTrailRuntimeConfiguration(staging, pluginData.configuration);
    setTrailRuntimeWorkspaceState(staging, pluginData.workspaceState);
    setSourceIssuesForPath(staging, "Trail/test.md", [{
      code: "test.issue",
      filePath: "Trail/test.md",
      message: "candidate health",
      scope: "file",
    }]);
    live.setState((state) => ({
      committed: { ...state.committed, revision: 7 },
      control: { kind: "refreshing", timezone: "UTC" },
    }));

    publishTrailReloadCandidate(
      live,
      createTrailReloadCandidate(staging.getState()),
      "Asia/Singapore",
    );

    const state = live.getState();
    expect(state.committed.revision).toBe(8);
    expect(state.committed.authoritative.configuration).toBe(pluginData.configuration);
    expect(state.committed.authoritative.workspaceState).toBe(pluginData.workspaceState);
    expect(state.health.sourceIssuesByPath["Trail/test.md"]).toHaveLength(1);
    expect(state.control).toEqual({ kind: "ready", timezone: "Asia/Singapore" });
  });

  it("tracks source health outside committed facts and reuses the empty snapshot", () => {
    const store = createTrailRuntimeStore();
    const filePath = "Trail/Collections/Triage.md";
    const first = selectSourceIssuesForPath(store.getState(), filePath);
    const committedRevision = store.getState().committed.revision;

    expect(first).toEqual([]);
    expect(selectSourceIssuesForPath(store.getState(), filePath)).toBe(first);
    expect(selectSourceIssuesForPath(store.getState(), undefined)).toBe(first);

    setSourceIssuesForPath(store, filePath, [{
      code: "test.invalid",
      filePath,
      message: "invalid fixture",
      scope: "file",
    }]);

    expect(selectSourceIssuesForPath(store.getState(), filePath)).toEqual([
      expect.objectContaining({ code: "test.invalid" }),
    ]);
    expect(store.getState().committed.revision).toBe(committedRevision);
  });
});