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
import { selectTrailSearchResults } from "./trail-search-query";

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

describe("Trail Search query", () => {
  it("finds title-bearing work objects across contexts and Project-owned Workflow Issues", () => {
    expect(selectTrailSearchResults(state(), "alpha")).toEqual([
      { entityId: "triage-a", kind: "triage-issue", title: "Alpha capture" },
      { entityId: "issue-a", kind: "workflow-issue", projectId: "project-a", title: "Alpha workflow" },
      { entityId: "initiative-a", kind: "initiative", title: "Initiative Alpha" },
      { entityId: "project-a", kind: "project", title: "Project Alpha" },
      { entityId: "milestone-a", kind: "milestone", projectId: "project-a", title: "Release Alpha" },
      { entityId: "issue-loose", kind: "workflow-issue", projectId: "project-b", title: "Loose work" },
    ]);
  });

  it("keeps blank Search empty and ranks an exact title ahead of broader matches", () => {
    const runtime = state();
    expect(selectTrailSearchResults(runtime, "   ")).toEqual([]);
    expect(selectTrailSearchResults(runtime, "Project Alpha")[0]).toEqual({
      entityId: "project-a",
      kind: "project",
      title: "Project Alpha",
    });
  });
});
