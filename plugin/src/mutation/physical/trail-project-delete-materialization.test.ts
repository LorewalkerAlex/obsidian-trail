import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const configuration = createTrailTestConfiguration();
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
const workspaceState = createTrailTestWorkspaceState(replacementProject.id);
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

function replacementSource() {
  return {
    issues: [],
    kind: "project" as const,
    milestones: [],
    project: replacementProject,
    sourcePath: replacementPath,
  };
}

function committedProjectWithChildren() {
  return {
    ...buildTrailCommittedRuntimeCandidate({
      pluginData: { configuration, workspaceState },
      sources: [
        {
          issues: [issue],
          kind: "project" as const,
          milestones: [milestone],
          project,
          sourcePath: projectPath,
        },
        replacementSource(),
      ],
    }),
    revision: 1,
  };
}

function committedEmptyProject() {
  return {
    ...buildTrailCommittedRuntimeCandidate({
      pluginData: { configuration, workspaceState },
      sources: [
        {
          issues: [],
          kind: "project" as const,
          milestones: [],
          project,
          sourcePath: projectPath,
        },
        replacementSource(),
      ],
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

  it("deletes an empty non-Default Project carrier as one Single Transaction", async () => {
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
        sources: [
          { initiative, kind: "initiative" as const, sourcePath: path },
          replacementSource(),
        ],
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
          replacementSource(),
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
