import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const configuration = createTrailTestConfiguration();
const workspaceState = createTrailTestWorkspaceState();
const projectPath = "Trail/Projects/0001 Project A.md";
const replacementPath = "Trail/Projects/0002 Project B.md";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};
const replacementProject = {
  id: "project-b",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project B",
};
const milestone = {
  id: "milestone-a",
  projectId: project.id,
  title: "Milestone A",
};
const issue = {
  context: "workflow" as const,
  createdAt: 1,
  id: "issue-a",
  labelIds: [],
  milestoneId: milestone.id,
  projectId: project.id,
  statusDefinitionId: "issue-unstarted",
  title: "Issue A",
};
const movedIssue = {
  ...issue,
  milestoneId: undefined,
  projectId: replacementProject.id,
};

function committedProjectWithChildren(defaultProject = false) {
  return {
    ...buildTrailCommittedRuntimeCandidate({
      pluginData: {
        configuration,
        workspaceState: defaultProject
          ? { ...workspaceState, defaultProjectId: project.id }
          : workspaceState,
      },
      sources: [
        {
          issues: [issue],
          kind: "project" as const,
          milestones: [milestone],
          project,
          sourcePath: projectPath,
        },
        {
          issues: [],
          kind: "project" as const,
          milestones: [],
          project: replacementProject,
          sourcePath: replacementPath,
        },
      ],
    }),
    revision: 1,
  };
}

function committedEmptyProject() {
  return {
    ...buildTrailCommittedRuntimeCandidate({
      pluginData: { configuration, workspaceState },
      sources: [{
        issues: [],
        kind: "project" as const,
        milestones: [],
        project,
        sourcePath: projectPath,
      }],
    }),
    revision: 1,
  };
}

function deleteProjectEffects() {
  return [
    {
      after: { kind: "issue" as const, value: movedIssue },
      before: { kind: "issue" as const, value: issue },
      kind: "replace-entity" as const,
    },
    { before: { kind: "milestone" as const, value: milestone }, kind: "delete-entity" as const },
    { before: { kind: "project" as const, value: project }, kind: "delete-entity" as const },
  ];
}

describe("Trail Project delete materialization", () => {
  it("prepares moved Issues in the replacement Project before deleting the old carrier", async () => {
    const plan = createTrailMutationPlan({
      commandId: "delete-project",
      effects: deleteProjectEffects(),
      intent: "workflow.project.delete",
      preconditions: [{
        entity: { kind: "project", value: replacementProject },
        kind: "entity-equals",
      }],
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committedProjectWithChildren(),
      { list: async () => [] },
    );

    expect(transaction).toMatchObject({
      commandId: "delete-project",
      intent: "workflow.project.delete",
      kind: "integrity-batch",
      stages: [
        {
          name: "prepare",
          operations: [{
            kind: "mutate-domain-source",
            mutation: { after: { kind: "issue", value: movedIssue }, kind: "create" },
            path: replacementPath,
            sourceKind: "project",
          }],
        },
        {
          name: "destructive",
          operations: [{ kind: "delete-domain-source", path: projectPath, sourceKind: "project" }],
        },
      ],
    });
  });

  it("commits Default Project clearing only after the Project carrier is deleted", async () => {
    const beforeWorkspace = { ...workspaceState, defaultProjectId: project.id };
    const afterWorkspace = {
      customViews: beforeWorkspace.customViews,
      favorites: beforeWorkspace.favorites,
      home: beforeWorkspace.home,
    };
    const plan = createTrailMutationPlan({
      commandId: "delete-default-project",
      effects: [
        ...deleteProjectEffects(),
        {
          after: afterWorkspace,
          before: beforeWorkspace,
          kind: "replace-workspace-state",
        },
      ],
      intent: "workflow.project.delete",
      preconditions: [{
        entity: { kind: "project", value: replacementProject },
        kind: "entity-equals",
      }],
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committedProjectWithChildren(true),
      { list: async () => [] },
    );

    expect(transaction.kind).toBe("integrity-batch");
    if (transaction.kind !== "integrity-batch") return;
    expect(transaction.stages.map(({ name }) => name)).toEqual([
      "prepare",
      "destructive",
      "commit",
    ]);
    expect(transaction.stages[2]?.operations).toEqual([{
      after: { configuration, workspaceState: afterWorkspace },
      before: { configuration, workspaceState: beforeWorkspace },
      kind: "save-plugin-data",
    }]);
  });

  it("deletes an empty Project carrier as one Single Transaction", async () => {
    const plan = createTrailMutationPlan({
      commandId: "delete-empty-project",
      effects: [{ before: { kind: "project", value: project }, kind: "delete-entity" }],
      intent: "workflow.project.delete",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committedEmptyProject(),
      { list: async () => [] },
    );

    expect(transaction).toMatchObject({
      commandId: "delete-empty-project",
      intent: "workflow.project.delete",
      kind: "single",
      operations: [{ kind: "delete-domain-source", path: projectPath, sourceKind: "project" }],
    });
  });

  it("rejects a Project root delete that does not resolve every child owned by its source", async () => {
    const plan = createTrailMutationPlan({
      commandId: "delete-incomplete-project",
      effects: [{ before: { kind: "project", value: project }, kind: "delete-entity" }],
      intent: "test.incomplete-project-delete",
    });

    await expect(materializeTrailPersistenceTransactionPlan(
      plan,
      committedProjectWithChildren(),
      { list: async () => [] },
    )).rejects.toThrow("resolve every entity owned by the Project source exactly once");
  });

  it("deletes an unreferenced Initiative carrier without requiring an Integrity Batch", async () => {
    const initiative = { id: "initiative-a", labelIds: [], title: "Initiative A" };
    const path = "Trail/Initiatives/0001 Initiative A.md";
    const committed = {
      ...buildTrailCommittedRuntimeCandidate({
        pluginData: { configuration, workspaceState },
        sources: [{ initiative, kind: "initiative" as const, sourcePath: path }],
      }),
      revision: 1,
    };
    const plan = createTrailMutationPlan({
      commandId: "delete-initiative",
      effects: [{ before: { kind: "initiative", value: initiative }, kind: "delete-entity" }],
      intent: "workflow.initiative.delete",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed,
      { list: async () => [] },
    );

    expect(transaction).toMatchObject({
      commandId: "delete-initiative",
      intent: "workflow.initiative.delete",
      kind: "single",
      operations: [{ kind: "delete-domain-source", path, sourceKind: "initiative" }],
    });
  });

  it("requires reference-resolving batch work before deleting a referenced Initiative", async () => {
    const initiative = { id: "initiative-a", labelIds: [], title: "Initiative A" };
    const referencedProject = { ...project, initiativeId: initiative.id };
    const committed = {
      ...buildTrailCommittedRuntimeCandidate({
        pluginData: { configuration, workspaceState },
        sources: [
          {
            initiative,
            kind: "initiative" as const,
            sourcePath: "Trail/Initiatives/0001 Initiative A.md",
          },
          {
            issues: [],
            kind: "project" as const,
            milestones: [],
            project: referencedProject,
            sourcePath: projectPath,
          },
        ],
      }),
      revision: 1,
    };
    const plan = createTrailMutationPlan({
      commandId: "delete-referenced-initiative",
      effects: [{ before: { kind: "initiative", value: initiative }, kind: "delete-entity" }],
      intent: "test.incomplete-initiative-delete",
    });

    await expect(materializeTrailPersistenceTransactionPlan(
      plan,
      committed,
      { list: async () => [] },
    )).rejects.toThrow("Initiative deletion with Project references requires Integrity Batch planning");
  });
});
