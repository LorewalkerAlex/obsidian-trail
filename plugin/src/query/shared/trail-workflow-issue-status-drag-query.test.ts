import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
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
import { selectTrailWorkflowIssueStatusDragItems } from "./trail-workflow-issue-status-drag-query";

function readyStore(estimate?: TrailWorkflowIssue["estimate"]) {
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    estimate,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Issue A",
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

describe("Workflow Issue Status drag Query", () => {
  it("marks a legal Completed target as requiring input when the Issue has no Estimate", () => {
    const { issue, store } = readyStore();
    const items = selectTrailWorkflowIssueStatusDragItems(store.getState(), [issue.id]);

    expect(items?.[0]?.expectedIssue).toBe(issue);
    expect(items?.[0]?.targets).toContainEqual({
      id: "issue-completed",
      requiresInput: true,
    });
    expect(items?.[0]?.targets).toContainEqual({
      id: "issue-canceled",
      requiresInput: false,
    });
  });

  it("keeps Completed immediately executable once Estimate already exists", () => {
    const { issue, store } = readyStore("medium");
    const items = selectTrailWorkflowIssueStatusDragItems(store.getState(), [issue.id]);

    expect(items?.[0]?.targets).toContainEqual({
      id: "issue-completed",
      requiresInput: false,
    });
  });
});
