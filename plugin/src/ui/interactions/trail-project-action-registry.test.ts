import { describe, expect, it, vi } from "vitest";

import type { TrailMutationActionResult } from "../../application/trail-application-support";
import type { TrailInitiative, TrailProject, TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type { TrailProjectDeleteReadModel } from "../../query/projects/trail-project-delete-query";
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
  executeTrailProjectCollectionAction,
  resolveTrailProjectActionContext,
  resolveTrailProjectActionScope,
  resolveTrailProjectBulkActionScope,
  resolveTrailProjectCollectionActionContext,
  type TrailProjectCollectionActionIntents,
} from "./trail-project-action-registry";

function deleteReadModel(isDefaultProject: boolean): TrailProjectDeleteReadModel {
  return {
    childIssueCount: 2,
    expectedProject: {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Project A",
    },
    isDefaultProject,
    milestoneCount: 1,
    replacementProjects: [{ id: "project-b", title: "Project B" }],
  };
}

function readyStore() {
  const alpha: TrailInitiative = { id: "initiative-alpha", labelIds: [], title: "Alpha" };
  const beta: TrailInitiative = { id: "initiative-beta", labelIds: [], title: "Beta" };
  const projectA: TrailProject = {
    id: "project-a",
    initiativeId: alpha.id,
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const projectB: TrailProject = {
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
    projectId: projectA.id,
    statusDefinitionId: "issue-started",
    title: "Active child",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projectA.id),
    },
    sources: [
      { initiative: alpha, kind: "initiative", sourcePath: "Trail/Initiatives/Alpha.md" },
      { initiative: beta, kind: "initiative", sourcePath: "Trail/Initiatives/Beta.md" },
      {
        issues: [activeIssue],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/B.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

function actionIds(context: ReturnType<typeof resolveTrailProjectCollectionActionContext>) {
  return context?.actions.map(({ id }) => id) ?? [];
}

describe("Project Action Registry", () => {
  it("exposes Delete Project as a destructive action for a writable non-default Project", () => {
    expect(resolveTrailProjectActionContext(deleteReadModel(false), true).actions).toEqual([{
      group: "destructive",
      id: "project.delete",
      label: "Delete project",
      targets: [],
    }]);
  });

  it("keeps Default Project deletion unavailable with a concrete recovery instruction", () => {
    const context = resolveTrailProjectActionContext(deleteReadModel(true), true);
    expect(context.actions).toEqual([]);
    expect(context.unavailableReason).toMatch(/Default Project/);
    expect(context.unavailableReason).toMatch(/settings/);
  });

  it("resolves selected and unselected context-menu scope without clearing retained selection", () => {
    const selected = new Set(["project-a", "project-b"]);
    expect(resolveTrailProjectActionScope({
      invokedProjectId: "project-a",
      selectedProjectIds: selected,
    })).toEqual(["project-a", "project-b"]);
    expect(resolveTrailProjectActionScope({
      invokedProjectId: "project-c",
      selectedProjectIds: selected,
    })).toEqual(["project-c"]);
    expect(resolveTrailProjectBulkActionScope(selected)).toEqual(["project-a", "project-b"]);
    expect(selected).toEqual(new Set(["project-a", "project-b"]));
  });

  it("intersects ordinary Project targets and excludes a completion target blocked for one member", () => {
    const store = readyStore();
    const context = resolveTrailProjectCollectionActionContext(
      store.getState(),
      ["project-a", "project-b"],
    );
    expect(actionIds(context)).toEqual([
      "project.change-status",
      "project.change-initiative",
    ]);
    expect(context?.actions.find(({ id }) => id === "project.change-status")?.targets)
      .not.toContainEqual({ id: "project-completed", label: "completed" });
    expect(context?.actions.find(({ id }) => id === "project.change-initiative")?.targets)
      .toEqual([
        { id: "project.initiative.none", label: "No initiative" },
        { id: "initiative-alpha", label: "Alpha" },
        { id: "initiative-beta", label: "Beta" },
      ]);
  });

  it("dispatches common Project actions through existing Application intents for every member", async () => {
    const store = readyStore();
    const context = resolveTrailProjectCollectionActionContext(
      store.getState(),
      ["project-a", "project-b"],
    );
    expect(context).not.toBeNull();
    if (context === null) return;

    const changeStatus = vi.fn((project: TrailProject, _target: string): TrailMutationActionResult => ({
      entityId: project.id,
      kind: "unchanged",
    }));
    const changeInitiative = vi.fn((project: TrailProject, _target?: string): TrailMutationActionResult => ({
      entityId: project.id,
      kind: "unchanged",
    }));
    const intents = { changeInitiative, changeStatus } satisfies TrailProjectCollectionActionIntents;

    await executeTrailProjectCollectionAction(
      intents,
      context,
      "project.change-status",
      "project-unstarted",
    );
    expect(changeStatus).toHaveBeenCalledTimes(2);

    await executeTrailProjectCollectionAction(
      intents,
      context,
      "project.change-initiative",
      "project.initiative.none",
    );
    expect(changeInitiative).toHaveBeenCalledTimes(2);
    expect(changeInitiative).toHaveBeenNthCalledWith(1, context.projects[0], undefined);
    expect(changeInitiative).toHaveBeenNthCalledWith(2, context.projects[1], undefined);
  });
});
