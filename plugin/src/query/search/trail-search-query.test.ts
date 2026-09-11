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
import { selectTrailSidebarSearchReadModel } from "./trail-search-query";

function state() {
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        initiative: {
          description: "Long range Alpha context",
          id: "initiative-a",
          labelIds: [],
          title: "Initiative Alpha",
        },
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative Alpha.md",
      },
      {
        issues: [{
          context: "workflow",
          createdAt: 1,
          id: "issue-a",
          labelIds: [],
          projectId: "project-a",
          statusDefinitionId: "issue-unstarted",
          title: "Alpha workflow",
        }],
        kind: "project",
        milestones: [{
          id: "milestone-a",
          projectId: "project-a",
          title: "Release Alpha",
        }],
        project: {
          id: "project-a",
          labelIds: [],
          statusDefinitionId: "project-unstarted",
          title: "Project Alpha",
        },
        sourcePath: "Trail/Projects/0001 Project Alpha.md",
      },
      {
        issues: [{
          context: "workflow",
          createdAt: 2,
          description: "Alpha lives here too",
          id: "issue-loose",
          labelIds: [],
          projectId: "project-b",
          statusDefinitionId: "issue-backlog",
          title: "Loose work",
        }],
        kind: "project",
        milestones: [],
        project: {
          id: "project-b",
          labelIds: [],
          statusDefinitionId: "project-unstarted",
          title: "Project Beta",
        },
        sourcePath: "Trail/Projects/0002 Project Beta.md",
      },
      {
        issues: [{
          context: "triage",
          due: 3,
          id: "triage-a",
          labelIds: [],
          title: "Alpha capture",
        }],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });
  return runtimeStore.getState();
}

describe("Trail Sidebar Search query", () => {
  it("returns only Initiative, Project, and Workflow Issue results grouped for the Sidebar", () => {
    expect(selectTrailSidebarSearchReadModel(state(), "alpha")).toEqual({
      initiatives: [
        { entityId: "initiative-a", kind: "initiative", title: "Initiative Alpha" },
      ],
      issues: [
        { entityId: "issue-a", kind: "workflow-issue", title: "Alpha workflow" },
        { entityId: "issue-loose", kind: "workflow-issue", title: "Loose work" },
      ],
      projects: [
        { entityId: "project-a", kind: "project", title: "Project Alpha" },
      ],
    });
  });

  it("keeps blank Search empty and ranks exact titles ahead of broader matches inside a group", () => {
    const runtime = state();
    expect(selectTrailSidebarSearchReadModel(runtime, "   ")).toEqual({
      initiatives: [],
      issues: [],
      projects: [],
    });
    expect(selectTrailSidebarSearchReadModel(runtime, "Project Alpha").projects[0]).toEqual({
      entityId: "project-a",
      kind: "project",
      title: "Project Alpha",
    });
  });
});
