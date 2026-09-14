import { describe, expect, it } from "vitest";

import type {
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
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
import { selectTrailHomeReadModel } from "./trail-home-query";

function singaporeTimestamp(
  year: number,
  monthIndex: number,
  day: number,
  hour = 12,
): number {
  return Date.UTC(year, monthIndex, day, hour - 8);
}

function readyHomeStore() {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const workflowIssues: readonly TrailWorkflowIssue[] = [
    {
      context: "workflow",
      createdAt: singaporeTimestamp(2026, 6, 1, 9),
      due: singaporeTimestamp(2026, 8, 16),
      id: "issue-backlog",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-backlog",
      title: "Backlog issue",
    },
    {
      context: "workflow",
      createdAt: singaporeTimestamp(2026, 6, 2, 9),
      due: singaporeTimestamp(2026, 8, 14),
      firstStartedAt: singaporeTimestamp(2026, 7, 1, 10),
      id: "issue-active",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-started",
      title: "Active issue",
    },
    {
      context: "workflow",
      createdAt: singaporeTimestamp(2026, 6, 3, 9),
      firstStartedAt: singaporeTimestamp(2026, 6, 4, 10),
      id: "issue-completed-recent",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-completed",
      terminalAt: singaporeTimestamp(2026, 8, 10, 11),
      title: "Recently completed",
    },
    {
      context: "workflow",
      createdAt: singaporeTimestamp(2026, 7, 5, 9),
      firstStartedAt: singaporeTimestamp(2026, 7, 6, 10),
      id: "issue-canceled",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-canceled",
      terminalAt: singaporeTimestamp(2026, 8, 12, 11),
      title: "Canceled issue",
    },
    {
      context: "workflow",
      createdAt: singaporeTimestamp(2026, 6, 10, 9),
      firstStartedAt: singaporeTimestamp(2026, 6, 11, 10),
      id: "issue-completed-old",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-completed",
      terminalAt: singaporeTimestamp(2026, 8, 7, 11),
      title: "Older completed",
    },
  ];
  const triageIssues: readonly TrailTriageIssue[] = [
    {
      context: "triage",
      due: singaporeTimestamp(2026, 8, 14),
      id: "triage-monday",
      labelIds: [],
      title: "Monday review",
    },
    {
      context: "triage",
      due: singaporeTimestamp(2026, 8, 15),
      id: "triage-tuesday",
      labelIds: [],
      title: "Tuesday review",
    },
  ];
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: workflowIssues,
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: triageIssues,
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return store;
}

describe("Trail Home query", () => {
  it("returns no Home projection until Configuration is readable", () => {
    const store = createTrailRuntimeStore();

    expect(selectTrailHomeReadModel(
      store.getState(),
      singaporeTimestamp(2026, 8, 14, 16),
    )).toBeNull();
  });

  it("derives the accepted week, lifecycle, and work-trend projections from one Runtime snapshot", () => {
    const store = readyHomeStore();
    const readModel = selectTrailHomeReadModel(
      store.getState(),
      singaporeTimestamp(2026, 8, 14, 16),
    );

    expect(readModel).not.toBeNull();
    if (readModel === null) throw new Error("Expected Home read model");

    expect(readModel.thisWeek.monthLabel).toBe("Sep");
    expect(readModel.thisWeek.days).toHaveLength(7);
    expect(readModel.thisWeek.days.map((day) => day.weekday)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(readModel.thisWeek.days[0]).toMatchObject({
      dayOfMonth: 14,
      isToday: true,
      issueDueCount: 1,
      triageDueCount: 1,
    });
    expect(readModel.thisWeek.days[1]).toMatchObject({
      dayOfMonth: 15,
      issueDueCount: 0,
      triageDueCount: 1,
    });
    expect(readModel.thisWeek.days[2]).toMatchObject({
      dayOfMonth: 16,
      issueDueCount: 1,
      triageDueCount: 0,
    });

    expect(readModel.lifecycle.days).toHaveLength(76);
    expect(readModel.lifecycle.days[0]).toMatchObject({
      createdCount: 1,
      id: "2026-07-01",
      startedCount: 0,
      terminalCount: 0,
      weekdayIndex: 2,
    });
    expect(readModel.lifecycle.months.map((month) => month.label)).toEqual([
      "Jul",
      "Aug",
      "Sep",
    ]);
    expect(readModel.lifecycle.days.find((day) => day.id === "2026-09-10"))
      .toMatchObject({ terminalCount: 1 });
    expect(readModel.lifecycle.days.find((day) => day.id === "2026-09-12"))
      .toMatchObject({ terminalCount: 1 });

    expect(readModel.workTrend.rangeLabel).toBe("Jul–Sep");
    expect(readModel.workTrend.hasHistory).toBe(true);
    expect(readModel.workTrend.days).toHaveLength(76);
    expect(readModel.workTrend.days[0]).toMatchObject({
      activeStock: 0,
      backlogStock: 1,
      completed7dCount: 0,
      id: "2026-07-01",
    });
    expect(readModel.workTrend.days.find((day) => day.id === "2026-09-10"))
      .toMatchObject({
        activeStock: 2,
        backlogStock: 1,
        completed7dCount: 2,
      });
    expect(readModel.workTrend.days[readModel.workTrend.days.length - 1]).toMatchObject({
      activeStock: 1,
      backlogStock: 1,
      completed7dCount: 1,
      id: "2026-09-14",
    });
  });
});
