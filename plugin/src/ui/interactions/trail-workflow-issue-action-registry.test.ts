import { describe, expect, it, vi } from "vitest";

import type { TrailMutationActionResult } from "../../application/trail-application-support";
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
import {
  executeTrailWorkflowIssueAction,
  resolveTrailWorkflowIssueActionContext,
  resolveTrailWorkflowIssueActionScope,
  resolveTrailWorkflowIssueBulkActionScope,
  type TrailWorkflowIssueActionIntents,
} from "./trail-workflow-issue-action-registry";

function workflowIssue(
  id: string,
  projectId: string,
  statusDefinitionId: string,
): TrailWorkflowIssue {
  return {
    context: "workflow",
    createdAt: 1,
    id,
    labelIds: [],
    projectId,
    statusDefinitionId,
    title: id,
    ...(statusDefinitionId === "issue-completed"
      ? { estimate: "small" as const, terminalAt: 2 }
      : {}),
  };
}

function createStore() {
  const projects = [
    { id: "project-a", labelIds: [], statusDefinitionId: "project-started", title: "Alpha" },
    { id: "project-b", labelIds: [], statusDefinitionId: "project-unstarted", title: "Beta" },
    { id: "project-c", labelIds: [], statusDefinitionId: "project-started", title: "Gamma" },
    { id: "project-d", labelIds: [], statusDefinitionId: "project-canceled", title: "Delta" },
    { id: "project-e", labelIds: [], statusDefinitionId: "project-started", title: "Epsilon" },
    { id: "project-f", labelIds: [], statusDefinitionId: "project-completed", title: "Finished" },
  ];
  const issues = [
    workflowIssue("issue-a", "project-a", "issue-started"),
    workflowIssue("issue-b", "project-a", "issue-backlog"),
    workflowIssue("issue-c", "project-c", "issue-started"),
    workflowIssue("issue-d", "project-d", "issue-started"),
    workflowIssue("issue-f", "project-f", "issue-completed"),
  ];
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState("project-a"),
    },
    sources: projects.map((project) => ({
      issues: issues.filter((issue) => issue.projectId === project.id),
      kind: "project" as const,
      milestones: [],
      project,
      sourcePath: `Trail/Projects/${project.id}.md`,
    })),
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { issues, store };
}

function actionIds(context: ReturnType<typeof resolveTrailWorkflowIssueActionContext>) {
  return context?.actions.map((action) => action.id) ?? [];
}

describe("Workflow Issue Action Registry", () => {
  it("resolves context-menu, explicit, and bulk scopes without silently clearing retained selection", () => {
    const selected = new Set(["issue-a", "issue-c"]);
    expect(resolveTrailWorkflowIssueActionScope({
      invokedIssueId: "issue-a",
      selectedIssueIds: selected,
      source: "context-menu",
    })).toEqual(["issue-a", "issue-c"]);
    expect(resolveTrailWorkflowIssueActionScope({
      invokedIssueId: "issue-b",
      selectedIssueIds: selected,
      source: "context-menu",
    })).toEqual(["issue-b"]);
    expect(resolveTrailWorkflowIssueActionScope({
      invokedIssueId: "issue-a",
      selectedIssueIds: selected,
      source: "explicit",
    })).toEqual(["issue-a"]);
    expect(resolveTrailWorkflowIssueBulkActionScope(selected)).toEqual(["issue-a", "issue-c"]);
    expect(selected).toEqual(new Set(["issue-a", "issue-c"]));
  });

  it("resolves stable single-Issue actions from EffectiveCapabilities and legal Query targets", () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(store.getState(), ["issue-a"]);

    expect(actionIds(context)).toEqual([
      "issue.move-project",
      "issue.cancel",
      "issue.delete",
    ]);
    expect(context?.actions.find(({ id }) => id === "issue.move-project")?.targets).toEqual([
      { id: "project-e", label: "Epsilon" },
      { id: "project-c", label: "Gamma" },
    ]);
    expect(context?.actions.find(({ id }) => id === "issue.cancel")?.targets).toEqual([
      { id: "issue-canceled", label: "canceled" },
    ]);
  });

  it("intersects ordinary per-Issue targets instead of inventing bulk-only legality", () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(
      store.getState(),
      ["issue-a", "issue-c"],
    );

    expect(context?.actions.find(({ id }) => id === "issue.move-project")?.targets).toEqual([
      { id: "project-e", label: "Epsilon" },
    ]);
    expect(actionIds(context)).toEqual([
      "issue.move-project",
      "issue.cancel",
      "issue.delete",
    ]);
  });

  it("keeps Canceled Project cleanup actions but does not expose ordinary delete", () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(store.getState(), ["issue-d"]);

    expect(actionIds(context)).toEqual([
      "issue.move-project",
      "issue.cancel",
    ]);
  });

  it("keeps terminal Project history movable without exposing normal child mutation", () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(store.getState(), ["issue-f"]);

    expect(actionIds(context)).toEqual(["issue.move-project"]);
  });

  it("returns explanatory temporary unavailability without a second lifecycle matrix", () => {
    const { store } = createStore();
    setTrailRuntimeControl(store, { kind: "refreshing" });

    const context = resolveTrailWorkflowIssueActionContext(store.getState(), ["issue-a"]);
    expect(context?.actions).toEqual([]);
    expect(context?.unavailableReason).toBe(
      "Actions are unavailable while Trail is refreshing.",
    );
  });

  it("dispatches stable Action IDs to existing Application intents for every scoped Issue", async () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(
      store.getState(),
      ["issue-a", "issue-c"],
    );
    expect(context).not.toBeNull();
    if (context === null) return;

    const moveToProject = vi.fn((expectedIssue: TrailWorkflowIssue, _targetProjectId: string): TrailMutationActionResult => ({
      entityId: expectedIssue.id,
      kind: "unchanged",
    }));
    const changeStatus = vi.fn((expectedIssue: TrailWorkflowIssue, _targetStatusDefinitionId: string): TrailMutationActionResult => ({
      entityId: expectedIssue.id,
      kind: "unchanged",
    }));
    const deleteIssue = vi.fn((expectedIssue: TrailWorkflowIssue) => ({
      commandId: `delete-${expectedIssue.id}`,
      completion: Promise.resolve(),
      entityId: expectedIssue.id,
    }));
    const intents = {
      changeStatus,
      delete: deleteIssue,
      moveToProject,
    } satisfies TrailWorkflowIssueActionIntents;

    await executeTrailWorkflowIssueAction(
      intents,
      context,
      "issue.move-project",
      "project-e",
    );
    expect(moveToProject).toHaveBeenCalledTimes(2);
    expect(moveToProject).toHaveBeenNthCalledWith(1, context.issues[0], "project-e");
    expect(moveToProject).toHaveBeenNthCalledWith(2, context.issues[1], "project-e");

    await executeTrailWorkflowIssueAction(
      intents,
      context,
      "issue.cancel",
      "issue-canceled",
    );
    expect(changeStatus).toHaveBeenCalledTimes(2);

    await executeTrailWorkflowIssueAction(intents, context, "issue.delete");
    expect(deleteIssue).toHaveBeenCalledTimes(2);
  });

  it("rejects a target that is not part of the resolved common action", async () => {
    const { store } = createStore();
    const context = resolveTrailWorkflowIssueActionContext(store.getState(), ["issue-a"]);
    expect(context).not.toBeNull();
    if (context === null) return;

    const moveToProject = vi.fn((_expectedIssue: TrailWorkflowIssue, _targetProjectId: string): TrailMutationActionResult => ({
      entityId: "unused",
      kind: "unchanged",
    }));
    const intents = {
      changeStatus: vi.fn((_expectedIssue: TrailWorkflowIssue, _targetStatusDefinitionId: string): TrailMutationActionResult => ({
        entityId: "unused",
        kind: "unchanged",
      })),
      delete: vi.fn((expectedIssue: TrailWorkflowIssue) => ({
        commandId: `delete-${expectedIssue.id}`,
        completion: Promise.resolve(),
        entityId: expectedIssue.id,
      })),
      moveToProject,
    } satisfies TrailWorkflowIssueActionIntents;

    await expect(executeTrailWorkflowIssueAction(
      intents,
      context,
      "issue.move-project",
      "project-b",
    )).rejects.toThrow("Workflow Issue action target is not available");
    expect(moveToProject).not.toHaveBeenCalled();
  });
});
