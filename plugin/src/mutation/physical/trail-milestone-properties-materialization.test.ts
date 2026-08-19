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
const milestone = {
  id: "milestone-a",
  projectId: project.id,
  title: "Milestone A",
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
      milestones: [milestone],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), revision: 1 };
}

describe("Milestone properties persistence materialization", () => {
  it("keeps an edited Milestone in its existing Project carrier", async () => {
    const updated = {
      ...milestone,
      description: "Checkpoint notes",
      due: 500,
      title: "Updated Milestone",
    };
    const plan = createTrailMutationPlan({
      commandId: "milestone-properties",
      effects: [{
        after: { kind: "milestone", value: updated },
        before: { kind: "milestone", value: milestone },
        kind: "replace-entity",
      }],
      intent: "workflow.milestone.edit-properties",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );

    expect(transaction.kind).toBe("single");
    if (transaction.kind !== "single") throw new Error("expected single transaction");
    expect(transaction.operations).toHaveLength(1);
    expect(transaction.operations[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Projects/0001 Project A.md",
      mutation: {
        after: { kind: "milestone", value: updated },
        before: { kind: "milestone", value: milestone },
        kind: "replace",
      },
    });
  });
});
