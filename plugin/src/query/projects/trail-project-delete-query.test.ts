import { describe, expect, it } from "vitest";

import type {
  TrailMilestone,
  TrailProject,
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
import { selectTrailProjectDeleteReadModel } from "./trail-project-delete-query";

function project(
  id: string,
  title: string,
  status: "canceled" | "completed" | "started" | "unstarted" = "started",
): TrailProject {
  return {
    id,
    labelIds: [],
    statusDefinitionId: `project-${status}`,
    title,
  };
}

function issue(
  id: string,
  projectId: string,
  status: "backlog" | "started",
): TrailWorkflowIssue {
  return {
    context: "workflow",
    createdAt: 1,
    id,
    labelIds: [],
    projectId,
    statusDefinitionId: `issue-${status}`,
    title: id,
  };
}

function readyStore(input: {
  readonly defaultProjectId: string;
  readonly issues?: readonly TrailWorkflowIssue[];
  readonly milestones?: readonly TrailMilestone[];
  readonly projects: readonly TrailProject[];
}) {
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(input.defaultProjectId),
    },
    sources: input.projects.map((projectValue, index) => ({
      issues: (input.issues ?? []).filter(({ projectId }) => projectId === projectValue.id),
      kind: "project" as const,
      milestones: (input.milestones ?? []).filter(({ projectId }) => projectId === projectValue.id),
      project: projectValue,
      sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${projectValue.title}.md`,
    })),
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

describe("Project Delete Query", () => {
  it("projects consequences and only replacement Projects that can accept every child Issue unchanged", () => {
    const source = project("project-source", "Source");
    const startedB = project("project-started-b", "Beta");
    const startedA = project("project-started-a", "Alpha");
    const unstarted = project("project-unstarted", "Planning", "unstarted");
    const completed = project("project-completed", "Done", "completed");
    const milestones: TrailMilestone[] = [
      { id: "milestone-a", projectId: source.id, title: "A" },
      { id: "milestone-b", projectId: source.id, title: "B" },
    ];
    const store = readyStore({
      defaultProjectId: startedA.id,
      issues: [
        issue("issue-backlog", source.id, "backlog"),
        issue("issue-started", source.id, "started"),
      ],
      milestones,
      projects: [source, startedB, unstarted, completed, startedA],
    });

    const model = selectTrailProjectDeleteReadModel(store.getState(), source.id);

    expect(model).toMatchObject({
      childIssueCount: 2,
      expectedProject: source,
      isDefaultProject: false,
      milestoneCount: 2,
      replacementProjects: [
        { id: startedA.id, title: startedA.title },
        { id: startedB.id, title: startedB.title },
      ],
    });
  });

  it("marks the current Workspace Default Project instead of inventing a delete override", () => {
    const source = project("project-source", "Source");
    const store = readyStore({
      defaultProjectId: source.id,
      projects: [source, project("project-other", "Other")],
    });

    expect(selectTrailProjectDeleteReadModel(store.getState(), source.id)?.isDefaultProject).toBe(true);
  });
});
