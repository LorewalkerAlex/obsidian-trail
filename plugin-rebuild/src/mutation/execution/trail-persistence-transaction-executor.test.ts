import { describe, expect, it, vi } from "vitest";

import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailPersistenceOperation } from "../physical/trail-persistence-transaction-plan";
import {
  executeTrailPersistenceTransaction,
  TrailSourceTransitionExecutionError,
} from "./trail-persistence-transaction-executor";

function accepted(path: string) {
  return {
    issues: [],
    kind: "accepted" as const,
    snapshot: { issues: [], kind: "triage" as const, sourcePath: path },
  };
}

function environment(events: string[], failSource = false) {
  const domainSources: TrailDomainSourceRepository = {
    create: async () => accepted("created"),
    createSource: async (source) => { events.push(`create:${source.path}`); return accepted(source.path); },
    deleteSource: async (path) => { events.push(`delete-source:${path}`); },
    list: async () => [],
    mutate: async (_kind, path, mutation) => {
      events.push(`${mutation.kind}:${path}`);
      if (failSource && path === "source.md" && mutation.kind === "delete") {
        throw new Error("source failed");
      }
      return accepted(path);
    },
    process: async (_kind, path) => accepted(path),
    read: async (_kind, path) => accepted(path),
    renameSource: async (_kind, from, to) => { events.push(`rename:${from}->${to}`); return accepted(to); },
  };
  const pluginData = {
    read: vi.fn(),
    save: vi.fn(),
  } as unknown as TrailPluginDataRepository;
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

describe("Trail persistence transaction executor", () => {
  it("executes Source Transition target before source", async () => {
    const events: string[] = [];
    await executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, environment(events));
    expect(events).toEqual(["create:target.md", "delete:source.md"]);
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

  it("attempts exactly one target compensation when source persistence fails", async () => {
    const events: string[] = [];
    await expect(executeTrailPersistenceTransaction({
      commandId: "move",
      compensation: [mutate("target.md", "delete")],
      intent: "move",
      kind: "source-transition",
      source: [mutate("source.md", "delete")],
      target: [mutate("target.md", "create")],
    }, environment(events, true))).rejects.toMatchObject({
      compensationSucceeded: true,
      name: "TrailSourceTransitionExecutionError",
    } satisfies Partial<TrailSourceTransitionExecutionError>);
    expect(events).toEqual(["create:target.md", "delete:source.md", "delete:target.md"]);
  });
});
