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
  selectTrailCycleAddIssuesReadModel,
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

function addIssuesStore() {
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
  const plannedProject = {
    id: "project-planned",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project Planned",
  };
  const member = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-member",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Already in cycle",
  };
  const alpha = {
    context: "workflow" as const,
    createdAt: 2,
    due: 100,
    id: "issue-alpha-candidate",
    labelIds: ["label-work"],
    priority: "high" as const,
    projectId: projectA.id,
    statusDefinitionId: "issue-unstarted",
    title: "Prepare Alpha release",
  };
  const beta = {
    context: "workflow" as const,
    createdAt: 3,
    id: "issue-beta-candidate",
    labelIds: [],
    projectId: projectB.id,
    statusDefinitionId: "issue-backlog",
    title: "Investigate Beta logs",
  };
  const completed = {
    context: "workflow" as const,
    createdAt: 4,
    id: "issue-completed-candidate",
    labelIds: [],
    projectId: projectA.id,
    statusDefinitionId: "issue-completed",
    terminalAt: 5,
    title: "Completed work",
  };
  const plannedIssue = {
    context: "workflow" as const,
    createdAt: 5,
    id: "issue-planned-project",
    labelIds: [],
    projectId: plannedProject.id,
    statusDefinitionId: "issue-backlog",
    title: "Planned project work",
  };
  const cycle = {
    id: "cycle-current",
    issueIds: [member.id],
    plannedEnd: 200,
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
        issues: [member, alpha, completed],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        issues: [beta],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project Beta.md",
      },
      {
        issues: [plannedIssue],
        kind: "project",
        milestones: [],
        project: plannedProject,
        sourcePath: "Trail/Projects/0003 Project Planned.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { alpha, beta, cycle, store };
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
    expect(model.projects).toEqual([
      { id: "project-a", issueCount: 2, title: "Project Alpha" },
      { id: "project-b", issueCount: 2, title: "Project Beta" },
    ]);
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

  it("filters visibility without removing persistent Project swimlanes", () => {
    const { currentCycle, store } = readyStore();
    const model = selectTrailCyclePageReadModel(store.getState(), currentCycle.id, {
      filter: {
        project: {
          kind: "discrete",
          values: [{ kind: "value", value: "project-a" }],
        },
      },
      now: 20,
    });

    expect(model?.kind).toBe("current");
    if (model?.kind !== "current") return;

    expect(model.visibleIssueIds).toEqual(["issue-started", "issue-completed"]);
    expect(model.projects).toEqual([
      { id: "project-a", issueCount: 2, title: "Project Alpha" },
      { id: "project-b", issueCount: 0, title: "Project Beta" },
    ]);
    expect(model.emptyKind).toBeUndefined();
  });

  it("discovers only open non-members from Started Projects for Add Issues and keeps search/filter transient", () => {
    const { alpha, beta, cycle, store } = addIssuesStore();
    const model = selectTrailCycleAddIssuesReadModel(store.getState(), cycle.id, {
      filter: {},
      now: 20,
      search: "",
    });

    expect(model?.candidateIds).toEqual([alpha.id, beta.id]);
    expect(model?.candidates.map(({ id }) => id)).toEqual([alpha.id, beta.id]);
    expect(model?.projects.map(({ id }) => id)).toEqual(["project-a", "project-b"]);

    const searched = selectTrailCycleAddIssuesReadModel(store.getState(), cycle.id, {
      filter: {},
      now: 20,
      search: "beta",
    });
    expect(searched?.candidateIds).toEqual([alpha.id, beta.id]);
    expect(searched?.candidates.map(({ id }) => id)).toEqual([beta.id]);

    const filtered = selectTrailCycleAddIssuesReadModel(store.getState(), cycle.id, {
      filter: {
        priority: {
          kind: "discrete",
          values: [{ kind: "value", value: "high" }],
        },
      },
      now: 20,
      search: "",
    });
    expect(filtered?.candidates.map(({ id }) => id)).toEqual([alpha.id]);
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
