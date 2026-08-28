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
  selectTrailCycleHistoryIds,
  selectTrailCyclePlanningIssueIds,
  selectTrailNextCycleCandidateIssueIds,
  selectTrailReadableCycleById,
} from "./trail-cycle-query";

function readyStore() {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const active = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Active",
  };
  const backlog = {
    context: "workflow" as const,
    createdAt: 2,
    id: "issue-backlog",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Backlog",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 3,
    estimate: "small" as const,
    id: "issue-completed",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 4,
    title: "Completed",
  };
  const openCycle = {
    id: "cycle-open",
    issueIds: [completed.id, active.id],
    plannedEnd: 100,
    startedAt: 50,
  };
  const olderClosed = {
    endedAt: 30,
    id: "cycle-old",
    issueIds: [active.id],
    plannedEnd: 25,
    startedAt: 10,
  };
  const newerClosed = {
    endedAt: 45,
    id: "cycle-new",
    issueIds: [completed.id, active.id],
    plannedEnd: 40,
    startedAt: 20,
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        issues: [active, backlog, completed],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        cycles: [olderClosed, newerClosed, openCycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { active, backlog, completed, newerClosed, openCycle, store };
}

describe("Trail Cycle page Query", () => {
  it("selects current planning candidates and newest-first history", () => {
    const { active, backlog, completed, openCycle, store } = readyStore();

    expect(selectTrailReadableCycleById(store.getState(), openCycle.id)).toBe(openCycle);
    expect(selectTrailCycleHistoryIds(store.getState())).toEqual(["cycle-new", "cycle-old"]);
    expect(selectTrailCyclePlanningIssueIds(store.getState())).toEqual([
      active.id,
      backlog.id,
    ]);
    expect(selectTrailCyclePlanningIssueIds(store.getState(), openCycle.id)).toEqual([
      active.id,
      backlog.id,
      completed.id,
    ]);
  });

  it("selects current non-terminal members as next-Cycle candidates", () => {
    const { active, completed, newerClosed, openCycle, store } = readyStore();

    expect(selectTrailNextCycleCandidateIssueIds(store.getState(), openCycle.id)).toEqual([]);
    expect(newerClosed.issueIds).toContain(completed.id);
    expect(selectTrailNextCycleCandidateIssueIds(store.getState(), newerClosed.id)).toEqual([
      active.id,
    ]);
  });
});
