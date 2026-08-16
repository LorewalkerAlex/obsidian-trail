import { describe, expect, it } from "vitest";

import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
  setTrailRuntimeSourceIssues,
} from "./trail-runtime-store";

describe("TrailRuntimeStore", () => {
  it("starts with a stable revision-zero committed container and a closed mutation gate", () => {
    const state = createTrailRuntimeStore().getState();
    expect(state.committed.revision).toBe(0);
    expect(state.committed.authoritative.domain.issuesById.size).toBe(0);
    expect(state.pending).toEqual([]);
    expect(state.control).toEqual({ kind: "loading" });
  });

  it("keeps control and health outside committed revision", () => {
    const store = createTrailRuntimeStore();
    setTrailRuntimeControl(store, { kind: "refreshing" });
    setTrailRuntimeSourceIssues(store, "Trail/Collections/Triage.md", [{
      code: "test",
      message: "problem",
      scope: "source",
      severity: "error",
      sourcePath: "Trail/Collections/Triage.md",
      stage: "physical",
    }]);
    expect(store.getState().committed.revision).toBe(0);
    expect(store.getState().control.kind).toBe("refreshing");
    expect(store.getState().health.sourceIssuesByPath["Trail/Collections/Triage.md"]).toHaveLength(1);
  });
});
