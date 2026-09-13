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
import {
  selectTrailCycleStartReadModel,
  selectTrailCyclesPageReadModel,
} from "./trail-cycles-page-query";

function cycleStore(includeCurrent: boolean) {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const active = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active issue",
  };
  const backlog = {
    context: "workflow" as const,
    createdAt: 2,
    id: "issue-backlog",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Backlog issue",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 3,
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: Date.UTC(2026, 7, 3),
    title: "Completed issue",
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
    issueIds: [active.id, completed.id],
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
        issues: [active, backlog, completed],
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
  return {
    active,
    backlog,
    completed,
    current,
    historicalNewer,
    historicalOlder,
    store,
  };
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

  it("projects one Start flow with empty ordinary selection and live Start-next preselection", () => {
    const { active, backlog, completed, historicalNewer, store } = cycleStore(false);
    const now = Date.UTC(2026, 8, 10, 4);

    const ordinary = selectTrailCycleStartReadModel(store.getState(), now);
    expect(ordinary?.canStart).toBe(true);
    expect(ordinary?.candidates.map(({ id }) => id)).toEqual([
      active.id,
      backlog.id,
    ]);
    expect(ordinary?.initialIssueIds).toEqual([]);

    const startNext = selectTrailCycleStartReadModel(
      store.getState(),
      now,
      historicalNewer.id,
    );
    expect(historicalNewer.issueIds).toContain(completed.id);
    expect(startNext?.candidates.map(({ id }) => id)).toEqual([
      active.id,
      backlog.id,
    ]);
    expect(startNext?.initialIssueIds).toEqual([active.id]);
  });
});
