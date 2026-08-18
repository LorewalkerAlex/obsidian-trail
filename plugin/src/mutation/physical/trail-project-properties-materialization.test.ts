import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};

function committed() {
  return { ...buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [{
      issues: [],
      kind: "project" as const,
      milestones: [],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), revision: 1 };
}

describe("Project properties persistence materialization", () => {
  it("updates the Project record before renaming its file when Title changes", async () => {
    const renamed = { ...project, title: "Renamed Project" };
    const plan = createTrailMutationPlan({
      commandId: "project-properties",
      effects: [{
        after: { kind: "project", value: renamed },
        before: { kind: "project", value: project },
        kind: "replace-entity",
      }],
      intent: "workflow.project.edit-properties",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );

    expect(transaction.kind).toBe("single");
    if (transaction.kind !== "single") throw new Error("expected single transaction");
    expect(transaction.operations).toHaveLength(2);
    expect(transaction.operations[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Projects/0001 Project A.md",
      mutation: { kind: "replace" },
    });
    expect(transaction.operations[1]).toEqual({
      from: "Trail/Projects/0001 Project A.md",
      kind: "rename-domain-source",
      sourceKind: "project",
      to: "Trail/Projects/0001 Renamed Project.md",
    });
  });
});
