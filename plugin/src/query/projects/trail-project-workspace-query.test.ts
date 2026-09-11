import { describe, expect, it } from "vitest";

import type {
  TrailCycle,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import type {
  TrailEstimate,
  TrailPriority,
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
import { selectTrailProjectWorkspaceReadModel } from "./trail-project-workspace-query";

const NOW = Date.UTC(2026, 8, 12, 9);
const DAY = 24 * 60 * 60 * 1000;

function issue(input: {
  readonly createdAt: number;
  readonly due?: number;
  readonly estimate?: TrailEstimate;
  readonly id: string;
  readonly labelIds?: readonly string[];
  readonly milestoneId?: string;
  readonly priority?: TrailPriority;
  readonly projectId: string;
  readonly status: TrailStatusCategory;
  readonly title?: string;
}): TrailWorkflowIssue {
  return {
    context: "workflow",
    createdAt: input.createdAt,
    due: input.due,
    estimate: input.estimate,
    id: input.id,
    labelIds: input.labelIds ?? [],
    milestoneId: input.milestoneId,
    priority: input.priority,
    projectId: input.projectId,
    statusDefinitionId: `issue-${input.status}`,
    title: input.title ?? input.id,
  };
}

function project(input: {
  readonly id: string;
  readonly status?: "canceled" | "completed" | "started" | "unstarted";
  readonly title?: string;
}): TrailProject {
  return {
    id: input.id,
    labelIds: [],
    statusDefinitionId: `project-${input.status ?? "started"}`,
    title: input.title ?? input.id,
  };
}

function readyStore(input: {
  readonly cycles?: readonly TrailCycle[];
  readonly milestones?: readonly TrailMilestone[];
  readonly projects: readonly TrailProject[];
  readonly workflowIssues: readonly TrailWorkflowIssue[];
}) {
  const configuration = createTrailTestConfiguration();
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(input.projects[0].id),
    },
    sources: [
      ...input.projects.map((projectValue, index) => ({
        issues: input.workflowIssues.filter((item) => item.projectId === projectValue.id),
        kind: "project" as const,
        milestones: (input.milestones ?? []).filter((item) => item.projectId === projectValue.id),
        project: projectValue,
        sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${projectValue.title}.md`,
      })),
      ...(input.cycles === undefined ? [] : [{
        cycles: input.cycles,
        kind: "cycles" as const,
        sourcePath: "Trail/Collections/Cycles.md",
      }]),
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

describe("Project Workspace Query", () => {
  it("builds the persistent Status skeleton and orders visible Issues by Due, Priority, Created At, then identity", () => {
    const projectA = project({ id: "project-a", title: "Project A" });
    const issues = [
      issue({
        createdAt: NOW - (8 * DAY),
        due: NOW + (3 * DAY),
        id: "issue-later-due",
        priority: "urgent",
        projectId: projectA.id,
        status: "started",
      }),
      issue({
        createdAt: NOW - (2 * DAY),
        due: NOW + DAY,
        id: "issue-sooner-low",
        priority: "low",
        projectId: projectA.id,
        status: "started",
      }),
      issue({
        createdAt: NOW - (3 * DAY),
        due: NOW + DAY,
        id: "issue-sooner-high",
        priority: "high",
        projectId: projectA.id,
        status: "started",
      }),
      issue({
        createdAt: NOW - DAY,
        id: "issue-backlog",
        projectId: projectA.id,
        status: "backlog",
      }),
    ];
    const currentCycle: TrailCycle = {
      id: "cycle-current",
      issueIds: ["issue-sooner-high"],
      plannedEnd: NOW + (7 * DAY),
      startedAt: NOW - DAY,
    };
    const store = readyStore({
      cycles: [currentCycle],
      projects: [projectA],
      workflowIssues: issues,
    });

    const page = selectTrailProjectWorkspaceReadModel(store.getState(), {
      filter: {},
      now: NOW,
      projectId: projectA.id,
    });

    expect(page?.sections.map((section) => ({
      id: section.id,
      issueIds: section.issues.map((item) => item.id),
    }))).toEqual([
      {
        id: "issue-started",
        issueIds: ["issue-sooner-high", "issue-sooner-low", "issue-later-due"],
      },
      { id: "issue-unstarted", issueIds: [] },
      { id: "issue-backlog", issueIds: ["issue-backlog"] },
      { id: "issue-completed", issueIds: [] },
      { id: "issue-canceled", issueIds: [] },
    ]);
    expect(page?.visibleIssueIds).toEqual([
      "issue-sooner-high",
      "issue-sooner-low",
      "issue-later-due",
      "issue-backlog",
    ]);
    expect(page?.sections.find((section) => section.id === "issue-started")?.issues[0])
      .toMatchObject({ id: "issue-sooner-high", inCurrentCycle: true });
    expect(page?.canCreateIssue).toBe(true);
  });

  it("filters by the frozen Project Workspace registry and preserves zero-count Status sections", () => {
    const projectA = project({ id: "project-a" });
    const milestone: TrailMilestone = {
      id: "milestone-a",
      projectId: projectA.id,
      title: "Milestone A",
    };
    const issues = [
      issue({
        createdAt: NOW - DAY,
        due: NOW,
        estimate: "large",
        id: "issue-match",
        labelIds: ["label-work"],
        milestoneId: milestone.id,
        priority: "high",
        projectId: projectA.id,
        status: "started",
      }),
      issue({
        createdAt: NOW,
        estimate: "small",
        id: "issue-other",
        projectId: projectA.id,
        status: "completed",
      }),
    ];
    const store = readyStore({
      milestones: [milestone],
      projects: [projectA],
      workflowIssues: issues,
    });

    const page = selectTrailProjectWorkspaceReadModel(store.getState(), {
      filter: {
        due: { kind: "due", value: { kind: "today" } },
        estimate: { kind: "discrete", values: [{ kind: "value", value: "large" }] },
        labels: { kind: "discrete", values: [{ kind: "value", value: "label-work" }] },
        milestone: { kind: "discrete", values: [{ kind: "value", value: milestone.id }] },
        priority: { kind: "discrete", values: [{ kind: "value", value: "high" }] },
        status: { kind: "discrete", values: [{ kind: "value", value: "issue-started" }] },
      },
      now: NOW,
      projectId: projectA.id,
    });

    expect(page?.visibleIssueIds).toEqual(["issue-match"]);
    expect(page?.sections).toHaveLength(5);
    expect(page?.sections.find((section) => section.id === "issue-started")?.issues[0]).toMatchObject({
      estimate: "large",
      labels: [{ id: "label-work", name: "Work" }],
      milestone: { id: milestone.id, title: milestone.title },
      priority: "high",
    });
    expect(page?.sections.find((section) => section.id === "issue-completed")?.issues).toEqual([]);
  });

  it("distinguishes true and filtered empty states and excludes terminal Projects from creation targets", () => {
    const active = project({ id: "project-active", status: "unstarted", title: "Active" });
    const terminal = project({ id: "project-terminal", status: "completed", title: "Terminal" });
    const issueA = issue({
      createdAt: NOW,
      id: "issue-a",
      priority: "low",
      projectId: active.id,
      status: "backlog",
    });
    const store = readyStore({ projects: [active, terminal], workflowIssues: [issueA] });

    const filtered = selectTrailProjectWorkspaceReadModel(store.getState(), {
      filter: {
        priority: { kind: "discrete", values: [{ kind: "value", value: "urgent" }] },
      },
      now: NOW,
      projectId: active.id,
    });
    expect(filtered?.emptyKind).toBe("filtered");
    expect(filtered?.creationTargets.map(({ id }) => id)).toEqual([active.id]);

    const terminalPage = selectTrailProjectWorkspaceReadModel(store.getState(), {
      filter: {},
      now: NOW,
      projectId: terminal.id,
    });
    expect(terminalPage?.emptyKind).toBe("true");
    expect(terminalPage?.canCreateIssue).toBe(false);
    expect(terminalPage?.creationTargets.map(({ id }) => id)).toEqual([active.id]);

    expect(selectTrailProjectWorkspaceReadModel(store.getState(), {
      filter: {},
      now: NOW,
      projectId: "missing",
    })).toBeNull();
  });
});
