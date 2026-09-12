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
  selectTrailCyclePageReadModel,
  selectTrailCyclesIndexReadModel,
} from "./trail-cycle-page-query";

function readyStore() {
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Alpha",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project Beta",
  };
  const started = {
    context: "workflow" as const,
    createdAt: 3,
    estimate: "medium" as const,
    id: "issue-started",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Active Alpha",
  };
  const startedSooner = {
    context: "workflow" as const,
    createdAt: 4,
    due: 10,
    id: "issue-started-sooner",
    labelIds: [],
    priority: "low" as const,
    projectId: projectB.id,
    statusDefinitionId: "issue-started",
    title: "Sooner Beta",
  };
  const todo = {
    context: "workflow" as const,
    createdAt: 2,
    id: "issue-todo",
    labelIds: [],
    projectId: projectB.id,
    statusDefinitionId: "issue-unstarted",
    title: "Todo Beta",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 1,
    estimate: "small" as const,
    id: "issue-completed",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 4,
    title: "Completed Alpha",
  };
  const currentCycle = {
    id: "cycle-current",
    issueIds: [todo.id, completed.id, started.id, startedSooner.id],
    plannedEnd: 200,
    startedAt: 100,
  };
  const historicalCycle = {
    endedAt: 90,
    id: "cycle-history",
    issueIds: [completed.id, started.id],
    plannedEnd: 80,
    startedAt: 50,
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projectA.id),
    },
    sources: [
      {
        issues: [started, completed],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        issues: [todo, startedSooner],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project Beta.md",
      },
      {
        cycles: [historicalCycle, currentCycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { currentCycle, historicalCycle, store };
}

describe("Trail Cycle Page query", () => {
  it("projects the Current Cycle through the shared Status skeleton and cross-Project Issue presentation", () => {
    const { currentCycle, store } = readyStore();
    const model = selectTrailCyclePageReadModel(store.getState(), currentCycle.id);

    expect(model?.kind).toBe("current");
    if (model?.kind !== "current") return;

    expect(model.cycle).toMatchObject({
      effort: 3,
      id: currentCycle.id,
      issueCount: 4,
      progress: { max: 4, value: 1 },
    });
    expect(model.sections.map(({ id }) => id)).toEqual([
      "issue-started",
      "issue-unstarted",
      "issue-backlog",
      "issue-completed",
      "issue-canceled",
    ]);
    expect(model.sections.find(({ id }) => id === "issue-started")?.issues.map(({ id }) => id))
      .toEqual(["issue-started-sooner", "issue-started"]);
    expect(model.sections.find(({ id }) => id === "issue-started")?.issues[1]).toMatchObject({
      id: "issue-started",
      project: { id: "project-a", title: "Project Alpha" },
      status: { category: "started" },
    });
    expect(model.sections.find(({ id }) => id === "issue-unstarted")?.issues[0]).toMatchObject({
      id: "issue-todo",
      project: { id: "project-b", title: "Project Beta" },
    });
    expect(model.visibleIssueIds).toEqual([
      "issue-started-sooner",
      "issue-started",
      "issue-todo",
      "issue-completed",
    ]);
  });

  it("keeps historical membership flat while resolving current live Issue fields", () => {
    const { historicalCycle, store } = readyStore();
    const model = selectTrailCyclePageReadModel(store.getState(), historicalCycle.id);

    expect(model?.kind).toBe("historical");
    if (model?.kind !== "historical") return;

    expect(model.cycle).toMatchObject({
      effort: 3,
      endedAt: historicalCycle.endedAt,
      issueCount: 2,
    });
    expect(model.cycle).not.toHaveProperty("progress");
    expect(model.issues.map(({ id }) => id)).toEqual([
      "issue-completed",
      "issue-started",
    ]);
    expect(model.issues[0]).toMatchObject({
      project: { title: "Project Alpha" },
      status: { category: "completed" },
    });
  });

  it("projects one Current Cycle plus newest-first closed history for the Cycles index", () => {
    const { currentCycle, historicalCycle, store } = readyStore();
    const model = selectTrailCyclesIndexReadModel(store.getState());

    expect(model?.current?.id).toBe(currentCycle.id);
    expect(model?.history).toEqual([expect.objectContaining({
      endedAt: historicalCycle.endedAt,
      id: historicalCycle.id,
      issueCount: historicalCycle.issueIds.length,
    })]);
  });
});
