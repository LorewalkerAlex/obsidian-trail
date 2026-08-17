import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const configuration = createTrailTestConfiguration();
const workspaceState = createTrailTestWorkspaceState();
const projectPath = "Trail/Projects/0001 Project A.md";
const projectlessPath = "Trail/Collections/Projectless Issues.md";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
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
const projectlessIssue = { ...issue, milestoneId: undefined, projectId: undefined };

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
        {
          issues: [],
          kind: "projectless-issues" as const,
          sourcePath: projectlessPath,
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

describe("Trail Project delete materialization", () => {
  it("moves Issues to Projectless before deleting the Project carrier as one destructive operation", async () => {
    const plan = createTrailMutationPlan({
      commandId: "delete-project",
      effects: [
        {
          after: { kind: "issue", value: projectlessIssue },
          before: { kind: "issue", value: issue },
          kind: "replace-entity",
        },
        { before: { kind: "milestone", value: milestone }, kind: "delete-entity" },
        { before: { kind: "project", value: project }, kind: "delete-entity" },
      ],
      intent: "workflow.project.delete",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committedProjectWithChildren(),
      { list: async () => [] },
    );

    expect(transaction.kind).toBe("integrity-batch");
    if (transaction.kind !== "integrity-batch") throw new Error("expected Integrity Batch");
    expect(transaction.stages).toHaveLength(2);
    expect(transaction.stages[0]).toEqual({
      name: "prepare",
      operations: [{
        kind: "mutate-domain-source",
        mutation: { after: { kind: "issue", value: projectlessIssue }, kind: "create" },
        options: undefined,
        path: projectlessPath,
        sourceKind: "projectless-issues",
      }],
    });
    expect(transaction.stages[1]).toMatchObject({
      name: "destructive",
      operations: [{ kind: "delete-domain-source", path: projectPath, sourceKind: "project" }],
    });
    const rootDelete = transaction.stages[1]?.operations[0];
    expect(rootDelete?.kind).toBe("delete-domain-source");
    if (rootDelete?.kind === "delete-domain-source") {
      expect(rootDelete.beforeEntities?.map(({ value }) => value.id)).toEqual([
        issue.id,
        milestone.id,
        project.id,
      ]);
    }
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
