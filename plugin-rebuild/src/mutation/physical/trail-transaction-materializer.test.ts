import { describe, expect, it } from "vitest";

import { createTrailMutationPlan } from "../plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { materializeTrailPersistenceTransactionPlan } from "./trail-transaction-materializer";

const configuration = createTrailTestConfiguration();
const workspaceState = createTrailTestWorkspaceState();
const projectA = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};
const projectB = { ...projectA, id: "project-b", title: "Project B" };
const issueA = {
  context: "workflow" as const,
  createdAt: 1,
  id: "issue-a",
  labelIds: [],
  projectId: "project-a",
  statusDefinitionId: "issue-unstarted",
  title: "Issue A",
};

function committed() {
  return { ...buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState },
    sources: [
      {
        issues: [issueA],
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
      {
        issues: [{ context: "triage", due: 10, id: "triage-a", labelIds: [], title: "Triage A" }],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), revision: 1 };
}

describe("Trail persistence transaction materializer", () => {
  it("allocates a Project file only at dequeue-time materialization", async () => {
    const plan = createTrailMutationPlan({
      commandId: "create-project",
      effects: [{
        after: {
          kind: "project",
          value: { ...projectA, id: "project-c", title: "Project C" },
        },
        kind: "create-entity",
      }],
      intent: "project-create",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [
        { kind: "file", name: "0001 Project A.md", path: "Trail/Projects/0001 Project A.md" },
        { kind: "file", name: "0002 Project B.md", path: "Trail/Projects/0002 Project B.md" },
      ] },
    );
    expect(transaction.kind).toBe("single");
    if (transaction.kind !== "single") throw new Error("expected single transaction");
    expect(transaction.operations[0]).toMatchObject({
      kind: "create-domain-source",
      source: { kind: "project", path: "Trail/Projects/0003 Project C.md" },
    });
  });

  it("materializes a relationship-moving Replace as destination-first Source Transition", async () => {
    const after = { ...issueA, projectId: "project-b" };
    const plan = createTrailMutationPlan({
      commandId: "move-issue",
      effects: [{
        after: { kind: "issue", value: after },
        before: { kind: "issue", value: issueA },
        kind: "replace-entity",
      }],
      intent: "issue-move",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );
    expect(transaction.kind).toBe("source-transition");
    if (transaction.kind !== "source-transition") throw new Error("expected source transition");
    expect(transaction.target[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Projects/0002 Project B.md",
      mutation: { kind: "create" },
    });
    expect(transaction.source[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Projects/0001 Project A.md",
      mutation: { kind: "delete" },
    });
    expect(transaction.compensation[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Projects/0002 Project B.md",
      mutation: { kind: "delete" },
    });
  });

  it("recognizes create-target/delete-source Accept shape as Source Transition", async () => {
    const triage = { context: "triage" as const, due: 10, id: "triage-a", labelIds: [], title: "Triage A" };
    const workflow = { ...issueA, id: "issue-new", projectId: "project-b" };
    const plan = createTrailMutationPlan({
      commandId: "accept",
      effects: [
        { after: { kind: "issue", value: workflow }, kind: "create-entity" },
        { before: { kind: "issue", value: triage }, kind: "delete-entity" },
      ],
      intent: "triage-accept",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );
    expect(transaction.kind).toBe("source-transition");
  });

  it("materializes Triage Convert to Project as a file-backed Source Transition", async () => {
    const triage = { context: "triage" as const, due: 10, id: "triage-a", labelIds: [], title: "Triage A" };
    const convertedProject = { ...projectA, id: "project-new", title: "Converted Project" };
    const plan = createTrailMutationPlan({
      commandId: "convert-triage-project",
      effects: [
        { after: { kind: "project", value: convertedProject }, kind: "create-entity" },
        { before: { kind: "issue", value: triage }, kind: "delete-entity" },
      ],
      intent: "triage-convert-project",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [
        { kind: "file", name: "0001 Project A.md", path: "Trail/Projects/0001 Project A.md" },
        { kind: "file", name: "0002 Project B.md", path: "Trail/Projects/0002 Project B.md" },
      ] },
    );
    expect(transaction.kind).toBe("source-transition");
    if (transaction.kind !== "source-transition") throw new Error("expected source transition");
    expect(transaction.target[0]).toMatchObject({
      kind: "create-domain-source",
      source: { kind: "project", path: "Trail/Projects/0003 Converted Project.md" },
    });
    expect(transaction.source[0]).toMatchObject({
      kind: "mutate-domain-source",
      path: "Trail/Collections/Triage.md",
      mutation: { kind: "delete" },
    });
    expect(transaction.compensation[0]).toEqual({
      kind: "delete-domain-source",
      path: "Trail/Projects/0003 Converted Project.md",
    });
  });

  it("coalesces Configuration and Workspace State replacement into one Plugin Data write", async () => {
    const nextConfiguration = { ...configuration, temporal: { timezone: "UTC" } };
    const nextWorkspace = { ...workspaceState, home: { density: "compact" } };
    const plan = createTrailMutationPlan({
      commandId: "plugin-data",
      effects: [
        { after: nextConfiguration, before: configuration, kind: "replace-configuration" },
        { after: nextWorkspace, before: workspaceState, kind: "replace-workspace-state" },
      ],
      intent: "settings",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );
    expect(transaction.kind).toBe("single");
    if (transaction.kind !== "single") throw new Error("expected single transaction");
    expect(transaction.operations).toHaveLength(1);
    expect(transaction.operations[0]).toMatchObject({ kind: "save-plugin-data" });
  });
  it("materializes mixed independent effects as the fixed Integrity Batch topology", async () => {
    const nextConfiguration = { ...configuration, temporal: { timezone: "UTC" } };
    const plan = createTrailMutationPlan({
      commandId: "batch",
      effects: [
        { after: nextConfiguration, before: configuration, kind: "replace-configuration" },
        {
          after: {
            kind: "issue",
            value: { ...issueA, id: "issue-new", projectId: "project-b", title: "New" },
          },
          kind: "create-entity",
        },
      ],
      intent: "batch",
    });
    const transaction = await materializeTrailPersistenceTransactionPlan(
      plan,
      committed(),
      { list: async () => [] },
    );
    expect(transaction.kind).toBe("integrity-batch");
    if (transaction.kind !== "integrity-batch") throw new Error("expected Integrity Batch");
    expect(transaction.stages.map((stage) => stage.name)).toEqual(["prepare"]);
    expect(transaction.stages[0]?.operations.map((operation) => operation.kind)).toEqual([
      "save-plugin-data",
      "mutate-domain-source",
    ]);
  });

});
