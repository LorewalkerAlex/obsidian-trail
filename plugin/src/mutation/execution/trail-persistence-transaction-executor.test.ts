import { describe, expect, it, vi } from "vitest";

import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import type { TrailPersistenceOperation } from "../physical/trail-persistence-transaction-plan";
import {
  executeTrailPersistenceTransaction,
  TrailIntegrityBatchExecutionError,
  type TrailPersistenceOperationResult,
  TrailSourceTransitionExecutionError,
} from "./trail-persistence-transaction-executor";

const pluginDataSnapshot: TrailPluginDataSnapshot = {
  configuration: createTrailTestConfiguration(),
  workspaceState: createTrailTestWorkspaceState(),
};

function accepted(path: string) {
  return {
    issues: [],
    kind: "accepted" as const,
    snapshot: { issues: [], kind: "triage" as const, sourcePath: path },
  };
}

function mutatedDomainSourceResult(path: string): TrailPersistenceOperationResult {
  return {
    change: { kind: "mutated" },
    kind: "domain-source",
    result: accepted(path),
  };
}

function environment(
  events: string[],
  failSource = false,
  sourceIssue = false,
  failPluginData = false,
) {
  const domainSources: TrailDomainSourceRepository = {
    create: async () => accepted("created"),
    createSource: async (source) => { events.push(`create:${source.path}`); return accepted(source.path); },
    deleteSource: async (path) => { events.push(`delete-source:${path}`); },
    deleteSourceIfUnchanged: async () => false,
    list: async () => [],
    mutate: async (_kind, path, mutation) => {
      events.push(`${mutation.kind}:${path}`);
      if (failSource && path === "source.md" && mutation.kind === "delete") {
        throw new Error("source failed");
      }
      if (sourceIssue) {
        return {
          issues: [{
            code: "test.source-issue",
            message: "post-write source issue",
            scope: "source" as const,
            severity: "error" as const,
            sourcePath: path,
            stage: "domain" as const,
          }],
          kind: "accepted" as const,
          snapshot: { issues: [], kind: "triage" as const, sourcePath: path },
        };
      }
      return accepted(path);
    },
    process: async (_kind, path) => accepted(path),
    read: async (_kind, path) => accepted(path),
    renameSource: async (_kind, from, to) => { events.push(`rename:${from}->${to}`); return accepted(to); },
  };
  const pluginData: TrailPluginDataRepository = {
    read: vi.fn(async () => ({ kind: "valid" as const, snapshot: pluginDataSnapshot })),
    save: vi.fn(async (snapshot: TrailPluginDataSnapshot): Promise<TrailPluginDataSnapshot> => {
      events.push("save-plugin-data");
      if (failPluginData) throw new Error("plugin data failed");
      return snapshot;
    }),
  };
  return { domainSources, pluginData };
}

function mutate(path: string, kind: "create" | "delete"): TrailPersistenceOperation {
  return {
    kind: "mutate-domain-source",
    mutation: kind === "create"
      ? {
          after: {
            kind: "issue",
            value: { context: "triage", due: 1, id: "x", labelIds: [], title: "X" },
          },
          kind,
        }
      : {
          before: {
            kind: "issue",
            value: { context: "triage", due: 1, id: "x", labelIds: [], title: "X" },
          },
          kind,
        },
    path,
    sourceKind: "triage",
  };
}

function savePluginData(): TrailPersistenceOperation {
  return {
    after: pluginDataSnapshot,
    before: pluginDataSnapshot,
    kind: "save-plugin-data",
  };
}

function transitionEnvironment(
  events: string[],
  sourceFailure: "after-write" | "ambiguous" | "before-write",
) {
  const issue = { context: "triage" as const, due: 1, id: "x", labelIds: [], title: "X" };
  let sourceHasIssue = true;
  let targetHasIssue = false;

  const snapshot = (path: string, hasIssue: boolean) => ({
    issues: hasIssue ? [issue] : [],
    kind: "triage" as const,
    sourcePath: path,
  });
  const acceptedState = (path: string, hasIssue: boolean) => ({
    issues: [],
    kind: "accepted" as const,
    snapshot: snapshot(path, hasIssue),
  });

  const domainSources = {
    async mutate(_kind: string, path: string, mutation: { readonly kind: string }) {
      events.push(`${mutation.kind}:${path}`);
      if (path === "target.md") {
        targetHasIssue = mutation.kind === "create";
        return acceptedState(path, targetHasIssue);
      }
      if (path === "source.md" && mutation.kind === "delete") {
        if (sourceFailure === "before-write") throw new Error("source failed before write");
        sourceHasIssue = false;
        throw new Error("source failed after write");
      }
      return acceptedState(path, sourceHasIssue);
    },
    async read(_kind: string, path: string) {
      events.push(`read:${path}`);
      if (sourceFailure === "ambiguous" && path === "source.md") {
        throw new Error("source reread unavailable");
      }
      return acceptedState(path, path === "source.md" ? sourceHasIssue : targetHasIssue);
    },
  } as unknown as TrailDomainSourceRepository;
  const pluginData = { read: vi.fn(), save: vi.fn() } as unknown as TrailPluginDataRepository;
  return { domainSources, pluginData };
}

function createdFileTransitionEnvironment(
  events: string[],
  targetChangedBeforeCompensation: boolean,
) {
  const sourceIssue = {
    context: "triage" as const,
    due: 1,
    id: "x",
    labelIds: [],
    title: "X",
  };
  const project = {
    id: "project-new",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "New Project",
  };
  const projectSnapshot = (title = project.title) => ({
    issues: [],
    kind: "project" as const,
    milestones: [],
    project: { ...project, title },
    sourcePath: "target.md",
  });
  const sourceState = {
    issues: [sourceIssue],
    kind: "triage" as const,
    sourcePath: "source.md",
  };
  const domainSources = {
    async createSource() {
      events.push("create-source:target.md");
      return { issues: [], kind: "accepted" as const, snapshot: projectSnapshot() };
    },
    async deleteSource(path: string) {
      events.push(`delete-source:${path}`);
    },
    async mutate(_kind: string, path: string, mutation: { readonly kind: string }) {
      events.push(`${mutation.kind}:${path}`);
      throw new Error("source failed before write");
    },
    async read(kind: string, path: string) {
      events.push(`read:${path}`);
      if (kind === "triage") {
        return { issues: [], kind: "accepted" as const, snapshot: sourceState };
      }
      return {
        issues: [],
        kind: "accepted" as const,
        snapshot: projectSnapshot(
          targetChangedBeforeCompensation ? "Externally changed" : project.title,
        ),
      };
    },
  } as unknown as TrailDomainSourceRepository;
  const pluginData = { read: vi.fn(), save: vi.fn() } as unknown as TrailPluginDataRepository;
  const target: TrailPersistenceOperation = {
    kind: "create-domain-source",
    source: { kind: "project", path: "target.md", project },
  };
  return {
    environment: { domainSources, pluginData },
    plan: {
      commandId: "convert",
      compensation: [{ kind: "delete-domain-source", path: "target.md" }] as const,
      intent: "triage.convert-to-project",
      kind: "source-transition" as const,
      source: [mutate("source.md", "delete")],
      target: [target],
    },
  };
}

describe("Trail persistence transaction executor", () => {
  it("fails a Trail-controlled write when authoritative reread returns source issues", async () => {
    await expect(executeTrailPersistenceTransaction({
      commandId: "command-source-issue",
      intent: "test.source-issue",
      kind: "single",
      operations: [mutate("Trail/Collections/Triage.md", "create")],
    }, environment([], false, true))).rejects.toThrow("reported source issues");
  });

  it("executes Source Transition target before source and preserves phase results", async () => {
    const events: string[] = [];
    const result = await executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, environment(events));
    expect(events).toEqual(["create:target.md", "delete:source.md"]);
    expect(result).toMatchObject({ topology: "source-transition" });
    if (result.topology !== "source-transition") throw new Error("expected source transition");
    expect(result.targetOperations.map((operation) => (
      operation.kind === "domain-source" ? operation.result.snapshot.sourcePath : operation.kind
    ))).toEqual(["target.md"]);
    expect(result.sourceOperations.map((operation) => (
      operation.kind === "domain-source" ? operation.result.snapshot.sourcePath : operation.kind
    ))).toEqual(["source.md"]);
  });

  it("returns the old source path when a file-backed source is renamed", async () => {
    const events: string[] = [];
    const result = await executeTrailPersistenceTransaction({
      commandId: "rename",
      intent: "rename-project",
      kind: "single",
      operations: [{
        from: "old.md",
        kind: "rename-domain-source",
        sourceKind: "project",
        to: "new.md",
      }],
    }, environment(events));

    expect(result.operations[0]).toMatchObject({
      change: { from: "old.md", kind: "renamed" },
      kind: "domain-source",
    });
    expect(events).toEqual(["rename:old.md->new.md"]);
  });

  it("rejects a hand-built empty transaction topology", async () => {
    await expect(executeTrailPersistenceTransaction({
      commandId: "empty",
      intent: "invalid",
      kind: "single",
      operations: [],
    }, environment([]))).rejects.toThrow(
      "Single Transaction requires at least one operation",
    );
  });

  it("rejects malformed Integrity Batch stage ordering before any I/O", async () => {
    const events: string[] = [];
    await expect(executeTrailPersistenceTransaction({
      commandId: "invalid-order",
      intent: "invalid-order",
      kind: "integrity-batch",
      stages: [
        { name: "commit", operations: [savePluginData()] },
        { name: "prepare", operations: [mutate("target.md", "create")] },
      ],
    }, environment(events))).rejects.toThrow(
      "ordered prepare -> destructive -> commit",
    );
    expect(events).toEqual([]);
  });

  it("rejects Plugin Data writes outside the Integrity Batch commit stage", async () => {
    const events: string[] = [];
    await expect(executeTrailPersistenceTransaction({
      commandId: "invalid-prepare",
      intent: "invalid-prepare",
      kind: "integrity-batch",
      stages: [{ name: "prepare", operations: [savePluginData()] }],
    }, environment(events))).rejects.toThrow(
      "prepare stage may contain only non-destructive Domain operations",
    );
    expect(events).toEqual([]);
  });

  it("executes a canonical Integrity Batch in prepare, destructive, commit order", async () => {
    const events: string[] = [];
    const result = await executeTrailPersistenceTransaction({
      commandId: "batch-success",
      intent: "batch-success",
      kind: "integrity-batch",
      stages: [
        { name: "prepare", operations: [mutate("target.md", "create")] },
        { name: "destructive", operations: [mutate("source.md", "delete")] },
        { name: "commit", operations: [savePluginData()] },
      ],
    }, environment(events));

    expect(events).toEqual([
      "create:target.md",
      "delete:source.md",
      "save-plugin-data",
    ]);
    expect(result.operations).toHaveLength(3);
  });

  it("stops an Integrity Batch after prepare failure and does not enter later stages", async () => {
    const events: string[] = [];
    const execution = executeTrailPersistenceTransaction({
      commandId: "batch-prepare-fail",
      intent: "batch-prepare-fail",
      kind: "integrity-batch",
      stages: [
        { name: "prepare", operations: [mutate("target.md", "create")] },
        { name: "destructive", operations: [mutate("source.md", "delete")] },
        { name: "commit", operations: [savePluginData()] },
      ],
    }, environment(events, false, true));

    await expect(execution).rejects.toMatchObject({
      completedOperations: [],
      name: "TrailIntegrityBatchExecutionError",
      stage: "prepare",
    } satisfies Partial<TrailIntegrityBatchExecutionError>);
    expect(events).toEqual(["create:target.md"]);
  });

  it("reports the durable prefix when an Integrity Batch destructive stage fails", async () => {
    const events: string[] = [];
    const execution = executeTrailPersistenceTransaction({
      commandId: "batch-destructive-fail",
      intent: "batch-destructive-fail",
      kind: "integrity-batch",
      stages: [
        { name: "prepare", operations: [mutate("target.md", "create")] },
        { name: "destructive", operations: [mutate("source.md", "delete")] },
        { name: "commit", operations: [savePluginData()] },
      ],
    }, environment(events, true));

    await expect(execution).rejects.toMatchObject({
      completedOperations: [mutatedDomainSourceResult("target.md")],
      name: "TrailIntegrityBatchExecutionError",
      stage: "destructive",
    } satisfies Partial<TrailIntegrityBatchExecutionError>);
    expect(events).toEqual(["create:target.md", "delete:source.md"]);
  });

  it("reports the complete Domain prefix when the final Integrity Batch commit fails", async () => {
    const events: string[] = [];
    const execution = executeTrailPersistenceTransaction({
      commandId: "batch-commit-fail",
      intent: "batch-commit-fail",
      kind: "integrity-batch",
      stages: [
        { name: "prepare", operations: [mutate("target.md", "create")] },
        { name: "destructive", operations: [mutate("source.md", "delete")] },
        { name: "commit", operations: [savePluginData()] },
      ],
    }, environment(events, false, false, true));

    await expect(execution).rejects.toMatchObject({
      completedOperations: [
        mutatedDomainSourceResult("target.md"),
        mutatedDomainSourceResult("source.md"),
      ],
      name: "TrailIntegrityBatchExecutionError",
      stage: "commit",
    } satisfies Partial<TrailIntegrityBatchExecutionError>);
    expect(events).toEqual([
      "create:target.md",
      "delete:source.md",
      "save-plugin-data",
    ]);
  });

  it("compensates target only after a clean reread proves source remained unchanged", async () => {
    const events: string[] = [];
    await expect(executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, transitionEnvironment(events, "before-write"))).rejects.toMatchObject({
      compensationSucceeded: true,
      name: "TrailSourceTransitionExecutionError",
    } satisfies Partial<TrailSourceTransitionExecutionError>);
    expect(events).toEqual([
      "create:target.md",
      "delete:source.md",
      "read:source.md",
      "delete:target.md",
    ]);
  });

  it("recovers successful source deletion instead of compensating target after an ambiguous write error", async () => {
    const events: string[] = [];
    const result = await executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, transitionEnvironment(events, "after-write"));
    expect(result).toMatchObject({ sourceRecovered: true, topology: "source-transition" });
    expect(events).toEqual([
      "create:target.md",
      "delete:source.md",
      "read:source.md",
    ]);
  });

  it("leaves target intact when source state cannot prove compensation is safe", async () => {
    const events: string[] = [];
    await expect(executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, transitionEnvironment(events, "ambiguous"))).rejects.toMatchObject({
      compensationSucceeded: false,
      name: "TrailSourceTransitionExecutionError",
    } satisfies Partial<TrailSourceTransitionExecutionError>);
    expect(events).toEqual([
      "create:target.md",
      "delete:source.md",
      "read:source.md",
    ]);
  });

  it("deletes a newly created file target only when its latest snapshot is unchanged", async () => {
    const events: string[] = [];
    const fixture = createdFileTransitionEnvironment(events, false);
    await expect(executeTrailPersistenceTransaction(
      fixture.plan,
      fixture.environment,
    )).rejects.toMatchObject({
      compensationSucceeded: true,
      name: "TrailSourceTransitionExecutionError",
    } satisfies Partial<TrailSourceTransitionExecutionError>);
    expect(events).toEqual([
      "create-source:target.md",
      "delete:source.md",
      "read:source.md",
      "read:target.md",
      "delete-source:target.md",
    ]);
  });

  it("keeps a changed newly created file target when compensation is no longer provably safe", async () => {
    const events: string[] = [];
    const fixture = createdFileTransitionEnvironment(events, true);
    await expect(executeTrailPersistenceTransaction(
      fixture.plan,
      fixture.environment,
    )).rejects.toMatchObject({
      compensationSucceeded: false,
      name: "TrailSourceTransitionExecutionError",
    } satisfies Partial<TrailSourceTransitionExecutionError>);
    expect(events).toEqual([
      "create-source:target.md",
      "delete:source.md",
      "read:source.md",
      "read:target.md",
    ]);
  });
});
