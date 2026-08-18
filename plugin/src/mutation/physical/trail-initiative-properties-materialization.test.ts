import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const initiative = {
  id: "initiative-a",
  labelIds: [],
  title: "Initiative A",
};

function committed() {
  return { ...buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [{
      initiative,
      kind: "initiative" as const,
      sourcePath: "Trail/Initiatives/0001 Initiative A.md",
    }],
  }), revision: 1 };
}

describe("Initiative properties persistence materialization", () => {
  it("updates the Initiative record before renaming its file when Title changes", async () => {
    const renamed = { ...initiative, title: "Renamed Initiative" };
    const plan = createTrailMutationPlan({
      commandId: "initiative-properties",
      effects: [{
        after: { kind: "initiative", value: renamed },
        before: { kind: "initiative", value: initiative },
        kind: "replace-entity",
      }],
      intent: "workflow.initiative.edit-properties",
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
      path: "Trail/Initiatives/0001 Initiative A.md",
      mutation: { kind: "replace" },
    });
    expect(transaction.operations[1]).toEqual({
      from: "Trail/Initiatives/0001 Initiative A.md",
      kind: "rename-domain-source",
      sourceKind: "initiative",
      to: "Trail/Initiatives/0001 Renamed Initiative.md",
    });
  });
});
