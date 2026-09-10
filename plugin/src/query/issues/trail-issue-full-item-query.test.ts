import { describe, expect, it } from "vitest";

import type {
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
import { selectTrailIssueFullItemReadModel } from "./trail-issue-full-item-query";

const NOW = Date.UTC(2026, 8, 12, 9);

function readyStore(projectStatusDefinitionId = "project-started") {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: projectStatusDefinitionId,
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: NOW - 10_000,
    description: "Full **Markdown** body",
    due: NOW + 86_400_000,
    estimate: "large",
    id: "issue-a",
    labelIds: ["label-work"],
    priority: "high",
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Deep edit the issue",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [{
      issues: [issue],
      kind: "project",
      milestones: [],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { issue, store };
}

describe("Issue Full Item Query", () => {
  it("projects content, Project context, and edit capability from one readable snapshot", () => {
    const { issue, store } = readyStore();

    const readModel = selectTrailIssueFullItemReadModel(store.getState(), issue.id);

    expect(readModel).toMatchObject({
      capabilities: { canEditPlanningFields: true },
      expectedIssue: { id: "issue-a", title: "Deep edit the issue" },
      issue: {
        description: "Full **Markdown** body",
        id: "issue-a",
        project: { id: "project-a", title: "Project A" },
        title: "Deep edit the issue",
      },
    });
  });

  it("keeps Full Item readable while terminal Project lifecycle removes planning edits", () => {
    const { issue, store } = readyStore("project-canceled");

    const readModel = selectTrailIssueFullItemReadModel(store.getState(), issue.id);

    expect(readModel?.issue.title).toBe("Deep edit the issue");
    expect(readModel?.capabilities.canEditPlanningFields).toBe(false);
  });
});
