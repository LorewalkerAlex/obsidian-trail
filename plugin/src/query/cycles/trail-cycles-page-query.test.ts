import { describe, expect, it } from "vitest";

import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { selectTrailCyclesPageReadModel } from "./trail-cycles-page-query";

function cycleStore(includeCurrent: boolean) {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const historicalOlder = {
    endedAt: Date.UTC(2026, 6, 20),
    id: "cycle-history-older",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 6, 20),
    startedAt: Date.UTC(2026, 6, 7),
  };
  const historicalNewer = {
    endedAt: Date.UTC(2026, 7, 3),
    id: "cycle-history-newer",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 7, 3),
    startedAt: Date.UTC(2026, 6, 21),
  };
  const current = {
    id: "cycle-current",
    issueIds: [],
    plannedEnd: Date.UTC(2026, 8, 20),
    startedAt: Date.UTC(2026, 8, 7),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        cycles: includeCurrent
          ? [historicalOlder, historicalNewer, current]
          : [historicalOlder, historicalNewer],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { current, historicalNewer, historicalOlder, store };
}

describe("Cycles Page query", () => {
  it("exposes newest-first history and the configured Start Cycle suggestion when no Cycle is open", () => {
    const { historicalNewer, historicalOlder, store } = cycleStore(false);
    const now = Date.UTC(2026, 8, 10, 4);
    const model = selectTrailCyclesPageReadModel(store.getState(), now);

    expect(model?.current).toBeUndefined();
    expect(model?.canStart).toBe(true);
    expect(model?.history.map(({ id }) => id)).toEqual([
      historicalNewer.id,
      historicalOlder.id,
    ]);
    expect(model?.suggestedPlannedEndDate).toEqual({
      day: 20,
      month: 9,
      year: 2026,
    });
  });

  it("suppresses Start Cycle while one Current Cycle exists", () => {
    const { current, store } = cycleStore(true);
    const model = selectTrailCyclesPageReadModel(
      store.getState(),
      Date.UTC(2026, 8, 10, 4),
    );

    expect(model?.current?.id).toBe(current.id);
    expect(model?.canStart).toBe(false);
    expect(model?.suggestedPlannedEndDate).toBeUndefined();
  });
});
