import { describe, expect, it } from "vitest";

import type {
  TrailCycle,
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
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";
import { createTrailWorkflowIssuePresentationProjector } from "./trail-workflow-issue-presentation-query";

const NOW = Date.UTC(2026, 8, 12, 9);

function readyStore() {
  const baseConfiguration = createTrailTestConfiguration();
  const configuration = {
    ...baseConfiguration,
    statusDefinitions: baseConfiguration.statusDefinitions.map((definition) => (
      definition.id === "issue-started"
        ? { ...definition, name: "In Progress" }
        : definition
    )),
  };
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Interaction pass",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: NOW - 10_000,
    description: "Inspect the full issue body without leaving the collection.",
    due: NOW + 86_400_000,
    estimate: "large",
    id: "issue-a",
    labelIds: ["label-work"],
    milestoneId: milestone.id,
    priority: "high",
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Build Issue Peek",
  };
  const cycle: TrailCycle = {
    id: "cycle-current",
    issueIds: [issue.id],
    plannedEnd: NOW + (7 * 86_400_000),
    startedAt: NOW - 86_400_000,
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [issue],
        kind: "project",
        milestones: [milestone],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { issue, store };
}

describe("Workflow Issue presentation Query", () => {
  it("projects one coherent read-only Issue detail shape from the supplied readable snapshot", () => {
    const { issue, store } = readyStore();
    const readable = selectTrailReadableRuntimeSnapshot(store.getState());

    const projectIssue = createTrailWorkflowIssuePresentationProjector(readable);
    expect(projectIssue).not.toBeNull();
    expect(projectIssue?.(issue))
      .toMatchObject({
        description: "Inspect the full issue body without leaving the collection.",
        estimate: "large",
        id: "issue-a",
        inCurrentCycle: true,
        labels: [{ id: "label-work", name: "Work" }],
        milestone: { id: "milestone-a", title: "Interaction pass" },
        priority: "high",
        project: { id: "project-a", title: "Project A" },
        status: {
          category: "started",
          id: "issue-started",
          label: "In Progress",
        },
        title: "Build Issue Peek",
      });
  });
});
