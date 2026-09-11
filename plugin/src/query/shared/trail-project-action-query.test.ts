import { describe, expect, it } from "vitest";

import type { TrailInitiative, TrailProject, TrailWorkflowIssue } from "../../domain/model/trail-entities";
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
  selectTrailProjectActionFacts,
  TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID,
} from "./trail-project-action-query";

function readyStore() {
  const alpha: TrailInitiative = { id: "initiative-alpha", labelIds: [], title: "Alpha" };
  const beta: TrailInitiative = { id: "initiative-beta", labelIds: [], title: "Beta" };
  const blockedProject: TrailProject = {
    id: "project-a",
    initiativeId: alpha.id,
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const openProject: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const activeIssue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: blockedProject.id,
    statusDefinitionId: "issue-started",
    title: "Active child",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(blockedProject.id),
    },
    sources: [
      { initiative: beta, kind: "initiative", sourcePath: "Trail/Initiatives/Beta.md" },
      { initiative: alpha, kind: "initiative", sourcePath: "Trail/Initiatives/Alpha.md" },
      {
        issues: [activeIssue],
        kind: "project",
        milestones: [],
        project: blockedProject,
        sourcePath: "Trail/Projects/A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: openProject,
        sourcePath: "Trail/Projects/B.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

describe("Project action Query", () => {
  it("projects legal Status and Initiative targets from one readable Runtime snapshot", () => {
    const store = readyStore();
    const facts = selectTrailProjectActionFacts(store.getState(), ["project-a", "project-b"]);
    expect(facts).not.toBeNull();
    if (facts === null) return;

    expect(facts.projects[0]?.legalStatusTargets.map(({ id }) => id))
      .not.toContain("project-completed");
    expect(facts.projects[1]?.legalStatusTargets.map(({ id }) => id))
      .toContain("project-completed");
    expect(facts.projects[0]?.legalInitiativeTargets).toEqual([
      { id: TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID, label: "No initiative" },
      { id: "initiative-alpha", label: "Alpha" },
      { id: "initiative-beta", label: "Beta" },
    ]);
    expect(facts.projects[0]?.currentInitiativeTargetId).toBe("initiative-alpha");
    expect(facts.projects[1]?.currentInitiativeTargetId).toBe(TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID);
  });
});
