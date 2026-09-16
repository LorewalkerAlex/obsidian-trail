import { describe, expect, it } from "vitest";

import type { TrailCycle } from "../../domain/model/trail-entities";
import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

describe("Cycle rollover persistence materialization", () => {
  it("updates the source Cycle before creating its successor in the shared Cycles carrier", async () => {
    const project = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Project A",
    };
    const issue = {
      context: "workflow" as const,
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-unstarted",
      title: "Issue A",
    };
    const source: TrailCycle = {
      id: "cycle-source",
      issueIds: [issue.id],
      plannedEnd: 100,
      startedAt: 10,
    };
    const closedSource: TrailCycle = {
      ...source,
      endedAt: 90,
      issueIds: [],
    };
    const successor: TrailCycle = {
      id: "cycle-next",
      issueIds: [issue.id],
      plannedEnd: 200,
      startedAt: 90,
    };
    const committed = {
      ...buildTrailCommittedRuntimeCandidate({
        pluginData: {
          configuration: createTrailTestConfiguration(),
          workspaceState: createTrailTestWorkspaceState(project.id),
        },
        sources: [
          {
            issues: [issue],
            kind: "project",
            milestones: [],
            project,
            sourcePath: "Trail/Projects/0001 Project A.md",
          },
          {
            cycles: [source],
            kind: "cycles",
            sourcePath: "Trail/Collections/Cycles.md",
          },
        ],
      }),
      revision: 1,
    };
    const plan = createTrailMutationPlan({
      commandId: "cycle-rollover",
      effects: [
        {
          after: { kind: "cycle", value: closedSource },
          before: { kind: "cycle", value: source },
          kind: "replace-entity",
        },
        { after: { kind: "cycle", value: successor }, kind: "create-entity" },
      ],
      intent: "planning.cycle.close-and-start-next",
    });

    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed,
      { list: async () => [] },
    );

    expect(transaction.kind).toBe("integrity-batch");
    if (transaction.kind !== "integrity-batch") return;
    expect(transaction.stages.map(({ name }) => name)).toEqual(["prepare"]);
    expect(transaction.stages[0]?.operations).toMatchObject([
      {
        kind: "mutate-domain-source",
        mutation: {
          after: { kind: "cycle", value: closedSource },
          before: { kind: "cycle", value: source },
          kind: "replace",
        },
        path: "Trail/Collections/Cycles.md",
        sourceKind: "cycles",
      },
      {
        kind: "mutate-domain-source",
        mutation: { after: { kind: "cycle", value: successor }, kind: "create" },
        path: "Trail/Collections/Cycles.md",
        sourceKind: "cycles",
      },
    ]);
  });
});
