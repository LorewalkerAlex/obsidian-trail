import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../reconcile/trail-runtime-reconciler";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  addTrailPendingPlan,
  projectTrailAuthoritativeStateWithEffects,
  projectTrailEffectiveAuthoritativeState,
  projectTrailEffectiveRuntimeSnapshot,
  removeTrailPendingPlan,
} from "./trail-runtime-projection";

function project(title: string) {
  return {
    kind: "project" as const,
    value: {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title,
    },
  };
}

describe("Trail runtime projection", () => {
  it("replays ordered plans and rebases automatically when an earlier plan disappears", () => {
    const store = createTrailRuntimeStore();
    const create = createTrailMutationPlan({
      commandId: "one",
      effects: [{ after: project("One"), kind: "create-entity" }],
      intent: "create",
    });
    const replace = createTrailMutationPlan({
      commandId: "two",
      effects: [{ after: project("Two"), before: project("One"), kind: "replace-entity" }],
      intent: "replace",
    });

    addTrailPendingPlan(store, create);
    addTrailPendingPlan(store, replace);
    expect(projectTrailEffectiveAuthoritativeState(store.getState()).domain.projectsById.get("project-a")?.title)
      .toBe("Two");

    removeTrailPendingPlan(store, "one");
    expect(projectTrailEffectiveAuthoritativeState(store.getState()).domain.projectsById.get("project-a")?.title)
      .toBe("Two");
  });

  it("projects structural/reference indexes from pending-aware Domain state", () => {
    const store = createTrailRuntimeStore();
    const configuration = createTrailTestConfiguration();
    const workspaceState = createTrailTestWorkspaceState();
    const projectA = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    };
    const projectB = {
      id: "project-b",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project B",
    };
    const beforeIssue = {
      context: "workflow" as const,
      createdAt: 1,
      id: "issue-a",
      labelIds: ["label-work"],
      projectId: projectA.id,
      statusDefinitionId: "issue-unstarted",
      title: "Issue A",
    };
    const afterIssue = {
      ...beforeIssue,
      labelIds: ["label-focus"],
      projectId: projectB.id,
      statusDefinitionId: "issue-started",
    };
    const committed = buildTrailCommittedRuntimeCandidate({
      pluginData: { configuration, workspaceState },
      sources: [
        {
          issues: [beforeIssue],
          kind: "project",
          milestones: [],
          project: projectA,
          sourcePath: "Trail/Projects/0001 Project A.md",
        },
        {
          issues: [],
          kind: "project",
          milestones: [],
          project: projectB,
          sourcePath: "Trail/Projects/0002 Project B.md",
        },
      ],
    });
    publishTrailCommittedRuntime(store, committed, { sourceIssuesByPath: {} });

    addTrailPendingPlan(store, createTrailMutationPlan({
      commandId: "move-issue",
      effects: [{
        after: { kind: "issue", value: afterIssue },
        before: { kind: "issue", value: beforeIssue },
        kind: "replace-entity",
      }],
      intent: "workflow.issue.move-project",
    }));

    expect(store.getState().committed.indexes.issuesByProjectId.get(projectA.id)).toEqual(["issue-a"]);
    expect(store.getState().committed.indexes.issuesByProjectId.get(projectB.id)).toBeUndefined();

    const effective = projectTrailEffectiveRuntimeSnapshot(store.getState());
    expect(effective.authoritative.domain.issuesById.get("issue-a")).toEqual(afterIssue);
    expect(effective.indexes.issuesByProjectId.get(projectA.id)).toBeUndefined();
    expect(effective.indexes.issuesByProjectId.get(projectB.id)).toEqual(["issue-a"]);
    expect(effective.indexes.entityRefsByLabelId.get("label-work")).toBeUndefined();
    expect(effective.indexes.entityRefsByLabelId.get("label-focus")).toEqual(["issue-a"]);
    expect(effective.indexes.entityRefsByStatusDefinitionId.get("issue-unstarted")).toBeUndefined();
    expect(effective.indexes.entityRefsByStatusDefinitionId.get("issue-started")).toEqual(["issue-a"]);
  });

  it("projects an explicit effect set without mutating the authoritative base", () => {
    const configuration = createTrailTestConfiguration();
    const workspaceState = createTrailTestWorkspaceState();
    const originalProject = project("Original").value;
    const committed = buildTrailCommittedRuntimeCandidate({
      pluginData: { configuration, workspaceState },
      sources: [{
        issues: [],
        kind: "project",
        milestones: [],
        project: originalProject,
        sourcePath: "Trail/Projects/0001 Original.md",
      }],
    });
    const nextConfiguration = { ...configuration, temporal: { timezone: "UTC" } };
    const nextProject = { ...originalProject, title: "Projected" };

    const projected = projectTrailAuthoritativeStateWithEffects(
      committed.authoritative,
      [
        {
          after: { kind: "project", value: nextProject },
          before: { kind: "project", value: originalProject },
          kind: "replace-entity",
        },
        {
          after: nextConfiguration,
          before: configuration,
          kind: "replace-configuration",
        },
      ],
    );

    expect(projected.domain.projectsById.get(originalProject.id)).toEqual(nextProject);
    expect(projected.configuration).toEqual(nextConfiguration);
    expect(committed.authoritative.domain.projectsById.get(originalProject.id)).toEqual(originalProject);
    expect(committed.authoritative.configuration).toEqual(configuration);
  });

  it("rejects duplicate pending command IDs", () => {
    const store = createTrailRuntimeStore();
    const plan = createTrailMutationPlan({
      commandId: "same",
      effects: [{ after: project("One"), kind: "create-entity" }],
      intent: "create",
    });
    addTrailPendingPlan(store, plan);
    expect(() => addTrailPendingPlan(store, plan)).toThrow(/Duplicate pending/);
  });
});
