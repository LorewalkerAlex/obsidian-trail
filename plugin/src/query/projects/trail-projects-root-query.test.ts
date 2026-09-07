import { describe, expect, it } from "vitest";

import type {
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import type {
  TrailPriority,
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";
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
  selectTrailProjectsRootReadModel,
  type TrailProjectsRootFilterState,
} from "./trail-projects-root-query";

const DAY_MS = 24 * 60 * 60 * 1000;

function project(input: {
  readonly due?: number;
  readonly id: string;
  readonly initiativeId?: string;
  readonly labelIds?: readonly string[];
  readonly priority?: TrailPriority;
  readonly status?: TrailProjectStatusCategory;
  readonly title?: string;
}): TrailProject {
  return {
    due: input.due,
    id: input.id,
    initiativeId: input.initiativeId,
    labelIds: input.labelIds ?? [],
    priority: input.priority,
    statusDefinitionId: `project-${input.status ?? "unstarted"}`,
    title: input.title ?? input.id,
  };
}

function workflowIssue(input: {
  readonly createdAt: number;
  readonly due?: number;
  readonly firstStartedAt?: number;
  readonly id: string;
  readonly milestoneId?: string;
  readonly priority?: TrailPriority;
  readonly projectId: string;
  readonly status: TrailStatusCategory;
  readonly terminalAt?: number;
}): TrailWorkflowIssue {
  return {
    context: "workflow",
    createdAt: input.createdAt,
    due: input.due,
    estimate: input.status === "completed" ? "small" : undefined,
    firstStartedAt: input.firstStartedAt,
    id: input.id,
    labelIds: [],
    milestoneId: input.milestoneId,
    priority: input.priority,
    projectId: input.projectId,
    statusDefinitionId: `issue-${input.status}`,
    terminalAt: input.terminalAt,
    title: input.id,
  };
}

function readyProjectsStore(input: {
  readonly initiatives?: readonly TrailInitiative[];
  readonly issues?: readonly TrailWorkflowIssue[];
  readonly milestones?: readonly TrailMilestone[];
  readonly projects: readonly TrailProject[];
}) {
  if (input.projects.length === 0) {
    throw new Error("Test store requires one Project for the canonical Default Project reference");
  }
  const configuration = createTrailTestConfiguration();
  const initiatives = input.initiatives ?? [];
  const milestones = input.milestones ?? [];
  const issues = input.issues ?? [];
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(input.projects[0].id),
    },
    sources: [
      ...initiatives.map((initiative, index) => ({
        initiative,
        kind: "initiative" as const,
        sourcePath: `Trail/Initiatives/${String(index + 1).padStart(4, "0")} ${initiative.title}.md`,
      })),
      ...input.projects.map((item, index) => ({
        issues: issues.filter(({ projectId }) => projectId === item.id),
        kind: "project" as const,
        milestones: milestones.filter(({ projectId }) => projectId === item.id),
        project: item,
        sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${item.title}.md`,
      })),
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { configuration, store };
}

function allProjectStatusesFilter(): TrailProjectsRootFilterState {
  return {
    status: {
      kind: "discrete",
      values: ["unstarted", "started", "completed", "canceled"].map((status) => ({
        kind: "value" as const,
        value: `project-${status}`,
      })),
    },
  };
}

describe("Projects Root Query", () => {
  it("applies the default non-terminal projection, stable Initiative grouping, and explicit terminal Status inclusion", () => {
    const initiatives: TrailInitiative[] = [
      { id: "initiative-z", labelIds: [], title: "Zeta" },
      { id: "initiative-a", labelIds: [], title: "Alpha" },
    ];
    const projects = [
      project({ id: "project-alpha", initiativeId: "initiative-a", status: "started" }),
      project({ id: "project-zeta-terminal", initiativeId: "initiative-z", status: "completed" }),
      project({ id: "project-none", status: "unstarted" }),
    ];
    const { store } = readyProjectsStore({ initiatives, projects });
    const now = Date.UTC(2026, 8, 12, 9);

    const defaultPage = selectTrailProjectsRootReadModel(store.getState(), {
      filter: {},
      now,
    });
    expect(defaultPage?.groups.map((group) => group.initiative?.title ?? "No Initiative")).toEqual([
      "Alpha",
      "No Initiative",
    ]);
    expect(defaultPage?.visibleProjectIds).toEqual(["project-alpha", "project-none"]);
    expect(defaultPage?.emptyKind).toBeUndefined();

    const terminalPage = selectTrailProjectsRootReadModel(store.getState(), {
      filter: {
        status: {
          kind: "discrete",
          values: [{ kind: "value", value: "project-completed" }],
        },
      },
      now,
    });
    expect(terminalPage?.visibleProjectIds).toEqual(["project-zeta-terminal"]);
    expect(terminalPage?.groups[0]?.initiative?.title).toBe("Zeta");
  });

  it("uses OR within a Project property and AND across Status, Initiative, Priority, Labels, and Due", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const initiative: TrailInitiative = { id: "initiative-a", labelIds: [], title: "Alpha" };
    const projects = [
      project({
        due: now + DAY_MS,
        id: "project-match",
        initiativeId: initiative.id,
        labelIds: ["label-work"],
        priority: "high",
        status: "started",
      }),
      project({
        due: now + DAY_MS,
        id: "project-wrong-priority",
        initiativeId: initiative.id,
        labelIds: ["label-work"],
        priority: "low",
        status: "started",
      }),
      project({
        due: now + (20 * DAY_MS),
        id: "project-wrong-due",
        initiativeId: initiative.id,
        labelIds: ["label-work"],
        priority: "urgent",
        status: "unstarted",
      }),
      project({
        due: now + DAY_MS,
        id: "project-none",
        priority: "urgent",
        status: "unstarted",
      }),
    ];
    const { store } = readyProjectsStore({ initiatives: [initiative], projects });

    const page = selectTrailProjectsRootReadModel(store.getState(), {
      filter: {
        due: { kind: "due", value: { kind: "this-week" } },
        initiative: {
          kind: "discrete",
          values: [{ kind: "value", value: initiative.id }],
        },
        labels: {
          kind: "discrete",
          values: [{ kind: "value", value: "label-work" }],
        },
        priority: {
          kind: "discrete",
          values: [
            { kind: "value", value: "urgent" },
            { kind: "value", value: "high" },
          ],
        },
        status: {
          kind: "discrete",
          values: [
            { kind: "value", value: "project-unstarted" },
            { kind: "value", value: "project-started" },
          ],
        },
      },
      now,
    });

    expect(page?.visibleProjectIds).toEqual(["project-match"]);

    const noInitiative = selectTrailProjectsRootReadModel(store.getState(), {
      filter: {
        initiative: {
          kind: "discrete",
          values: [{ kind: "none" }],
        },
      },
      now,
    });
    expect(noInitiative?.visibleProjectIds).toEqual(["project-none"]);
  });

  it("orders actionable Projects before terminal Projects, then Due, lifecycle, Priority, and stable identity", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const initiative: TrailInitiative = { id: "initiative-a", labelIds: [], title: "Alpha" };
    const due = now + (3 * DAY_MS);
    const projects = [
      project({ due: now - DAY_MS, id: "project-terminal", initiativeId: initiative.id, priority: "urgent", status: "completed" }),
      project({ due, id: "project-started", initiativeId: initiative.id, priority: "urgent", status: "started" }),
      project({ due, id: "project-unstarted-low", initiativeId: initiative.id, priority: "low", status: "unstarted" }),
      project({ due, id: "project-unstarted-high-z", initiativeId: initiative.id, priority: "high", status: "unstarted" }),
      project({ due, id: "project-unstarted-high-a", initiativeId: initiative.id, priority: "high", status: "unstarted" }),
      project({ id: "project-no-due", initiativeId: initiative.id, priority: "urgent", status: "unstarted" }),
    ];
    const { store } = readyProjectsStore({ initiatives: [initiative], projects });

    const page = selectTrailProjectsRootReadModel(store.getState(), {
      filter: allProjectStatusesFilter(),
      now,
    });

    expect(page?.visibleProjectIds).toEqual([
      "project-unstarted-high-a",
      "project-unstarted-high-z",
      "project-unstarted-low",
      "project-started",
      "project-no-due",
      "project-terminal",
    ]);
  });

  it("projects current-scope Progress without counting Canceled Issues", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const projects = [
      project({ id: "project-progress", status: "started" }),
      project({ id: "project-unavailable", status: "started" }),
    ];
    const issues = [
      workflowIssue({ createdAt: now - (10 * DAY_MS), id: "issue-completed", projectId: "project-progress", status: "completed", terminalAt: now - DAY_MS }),
      workflowIssue({ createdAt: now - (9 * DAY_MS), id: "issue-active", projectId: "project-progress", status: "started" }),
      workflowIssue({ createdAt: now - (8 * DAY_MS), id: "issue-canceled", projectId: "project-progress", status: "canceled", terminalAt: now - DAY_MS }),
      workflowIssue({ createdAt: now - (7 * DAY_MS), id: "issue-only-canceled", projectId: "project-unavailable", status: "canceled", terminalAt: now - DAY_MS }),
    ];
    const { store } = readyProjectsStore({ issues, projects });

    const page = selectTrailProjectsRootReadModel(store.getState(), { filter: {}, now });
    expect(page?.groups[0]?.projects.find(({ id }) => id === "project-progress")?.progress).toEqual({
      max: 2,
      value: 1,
    });
    expect(page?.groups[0]?.projects.find(({ id }) => id === "project-unavailable")?.progress).toEqual({
      unavailable: true,
    });
  });

  it("derives execution evidence, active Due markers, and the latest future Due horizon", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const item = project({
      due: now + (30 * DAY_MS),
      id: "project-execution",
      status: "started",
    });
    const milestones: TrailMilestone[] = [
      {
        due: now + (20 * DAY_MS),
        id: "milestone-active",
        projectId: item.id,
        title: "Active milestone",
      },
      {
        due: now + (40 * DAY_MS),
        id: "milestone-complete",
        projectId: item.id,
        title: "Complete milestone",
      },
    ];
    const issues = [
      workflowIssue({
        createdAt: now - (25 * DAY_MS),
        due: now + (10 * DAY_MS),
        firstStartedAt: now - (20 * DAY_MS),
        id: "issue-open-started",
        milestoneId: "milestone-active",
        projectId: item.id,
        status: "started",
      }),
      workflowIssue({
        createdAt: now - (24 * DAY_MS),
        due: now - (3 * DAY_MS),
        firstStartedAt: now - (15 * DAY_MS),
        id: "issue-closed-started",
        milestoneId: "milestone-complete",
        projectId: item.id,
        status: "completed",
        terminalAt: now - (5 * DAY_MS),
      }),
    ];
    const { store } = readyProjectsStore({ issues, milestones, projects: [item] });

    const page = selectTrailProjectsRootReadModel(store.getState(), { filter: {}, now });
    const row = page?.timeline.rows[0];
    expect(row?.historicalSpan).toEqual({
      end: now,
      kind: "execution",
      start: now - (20 * DAY_MS),
    });
    expect(row?.dueMarkers.map(({ id }) => id)).toEqual([
      "issue:issue-open-started",
      "milestone:milestone-active",
      "project:project-execution",
    ]);
    expect(row?.futureSpan).toEqual({
      end: now + (30 * DAY_MS),
      start: now,
    });
  });

  it("keeps never-started planning/lifecycle evidence distinct from future Due evidence", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const startedProject = project({ id: "project-started-shell", status: "started" });
    const dueProject = project({ id: "project-due-only", status: "unstarted" });
    const closedProject = project({ id: "project-closed", status: "completed" });
    const projects = [startedProject, dueProject, closedProject];
    const issues = [
      workflowIssue({
        createdAt: now - (20 * DAY_MS),
        id: "issue-started-shell",
        projectId: startedProject.id,
        status: "backlog",
      }),
      workflowIssue({
        createdAt: now - (15 * DAY_MS),
        due: now + (15 * DAY_MS),
        id: "issue-due-only",
        projectId: dueProject.id,
        status: "backlog",
      }),
      workflowIssue({
        createdAt: now - (40 * DAY_MS),
        id: "issue-closed-completed",
        projectId: closedProject.id,
        status: "completed",
        terminalAt: now - (10 * DAY_MS),
      }),
      workflowIssue({
        createdAt: now - (35 * DAY_MS),
        id: "issue-closed-canceled",
        projectId: closedProject.id,
        status: "canceled",
        terminalAt: now - (5 * DAY_MS),
      }),
    ];
    const { store } = readyProjectsStore({ issues, projects });

    const page = selectTrailProjectsRootReadModel(store.getState(), {
      filter: allProjectStatusesFilter(),
      now,
    });
    const rows = new Map(page?.timeline.rows.map((row) => [row.id, row] as const));

    expect(rows.get(startedProject.id)?.historicalSpan).toEqual({
      end: now,
      kind: "planning",
      start: now - (20 * DAY_MS),
    });
    expect(rows.get(dueProject.id)?.historicalSpan).toEqual({
      end: now + (15 * DAY_MS),
      kind: "planning",
      start: now - (15 * DAY_MS),
    });
    expect(rows.get(dueProject.id)?.futureSpan).toEqual({
      end: now + (15 * DAY_MS),
      start: now,
    });
    expect(rows.get(closedProject.id)?.historicalSpan).toEqual({
      end: now - (5 * DAY_MS),
      kind: "planning",
      start: now - (40 * DAY_MS),
    });
  });

  it("omits evidence-free and childless Projects while preserving independently active child Due in a canceled Project", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const childless = project({ due: now + DAY_MS, id: "project-childless", status: "unstarted" });
    const planned = project({ id: "project-planned", status: "unstarted" });
    const canceled = project({ due: now + (20 * DAY_MS), id: "project-canceled", status: "canceled" });
    const issues = [
      workflowIssue({
        createdAt: now - (10 * DAY_MS),
        id: "issue-planned",
        projectId: planned.id,
        status: "backlog",
      }),
      workflowIssue({
        createdAt: now - (12 * DAY_MS),
        due: now + (5 * DAY_MS),
        id: "issue-canceled-parent-open-child",
        projectId: canceled.id,
        status: "unstarted",
      }),
    ];
    const { store } = readyProjectsStore({ issues, projects: [childless, planned, canceled] });

    const page = selectTrailProjectsRootReadModel(store.getState(), {
      filter: allProjectStatusesFilter(),
      now,
    });
    expect(page?.timeline.rows.map(({ id }) => id)).toEqual([canceled.id]);
    expect(page?.timeline.rows[0]?.dueMarkers.map(({ id }) => id)).toEqual([
      "issue:issue-canceled-parent-open-child",
    ]);
    expect(page?.timeline.rows[0]?.futureSpan?.end).toBe(now + (5 * DAY_MS));
  });

  it("distinguishes user-filtered emptiness, default projection emptiness, and Timeline projection emptiness", () => {
    const now = Date.UTC(2026, 8, 12, 9);
    const completed = project({ id: "project-completed", status: "completed" });
    const { store: terminalStore } = readyProjectsStore({ projects: [completed] });

    const defaultPage = selectTrailProjectsRootReadModel(terminalStore.getState(), { filter: {}, now });
    expect(defaultPage?.emptyKind).toBe("projection");

    const filteredPage = selectTrailProjectsRootReadModel(terminalStore.getState(), {
      filter: {
        priority: {
          kind: "discrete",
          values: [{ kind: "value", value: "urgent" }],
        },
      },
      now,
    });
    expect(filteredPage?.emptyKind).toBe("filtered");

    const planned = project({ id: "project-planned", status: "unstarted" });
    const issue = workflowIssue({
      createdAt: now - DAY_MS,
      id: "issue-planned",
      projectId: planned.id,
      status: "backlog",
    });
    const { store: plannedStore } = readyProjectsStore({ issues: [issue], projects: [planned] });
    const plannedPage = selectTrailProjectsRootReadModel(plannedStore.getState(), { filter: {}, now });
    expect(plannedPage?.visibleProjectIds).toEqual([planned.id]);
    expect(plannedPage?.timeline.rows).toEqual([]);
    expect(plannedPage?.timeline.projectionEmpty).toBe(true);
  });
});
