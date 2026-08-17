import { describe, expect, it, vi } from "vitest";

import { createTrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import { TrailMutationQueue } from "../mutation/queue/trail-mutation-queue";
import type { TrailDomainSourceRepository } from "../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../persistence/plugin-data/trail-plugin-data-repository";
import {
  buildTrailCommittedRuntimeCandidate,
  buildTrailRuntimeCandidateAfterChanges,
  publishTrailCommittedRuntime,
} from "../runtime/reconcile/trail-runtime-reconciler";
import { createTrailRuntimeStore, setTrailRuntimeControl } from "../runtime/store/trail-runtime-store";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../test/trail-test-fixtures";
import {
  createTrailAuthoritativeSourceSync,
  runtimeChangesFromPersistenceResult,
} from "./trail-authoritative-source-sync";

function readyHarness(options: { readonly failMutate?: boolean } = {}) {
  const runtimeStore = createTrailRuntimeStore();
  const pluginDataSnapshot = {
    configuration: createTrailTestConfiguration(),
    workspaceState: createTrailTestWorkspaceState(),
  };
  const committed = buildTrailCommittedRuntimeCandidate({
    pluginData: pluginDataSnapshot,
    sources: [{ issues: [], kind: "triage", sourcePath: "Trail/Collections/Triage.md" }],
  });
  publishTrailCommittedRuntime(runtimeStore, committed, { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });

  const domainSources = {
    list: async () => [],
    async mutate(_kind: string, path: string, mutation: { readonly after?: { readonly value: unknown } }) {
      if (options.failMutate) throw new Error("write failed");
      const issue = mutation.after?.value;
      return {
        issues: [],
        kind: "accepted" as const,
        snapshot: { issues: issue === undefined ? [] : [issue], kind: "triage" as const, sourcePath: path },
      };
    },
  } as unknown as TrailDomainSourceRepository;
  const pluginData = {
    read: async () => ({ kind: "valid" as const, snapshot: pluginDataSnapshot }),
    save: async () => pluginDataSnapshot,
  } as TrailPluginDataRepository;
  return { domainSources, pluginData, runtimeStore };
}

describe("Authoritative Source Sync", () => {
  it("settles an authoritative reread before removing optimistic intent", async () => {
    const harness = readyHarness();
    const issue = {
      context: "triage" as const,
      due: 100,
      id: "triage-a",
      labelIds: [],
      title: "Capture",
    };
    const sync = createTrailAuthoritativeSourceSync({
      domainSources: harness.domainSources,
      mutationQueue: new TrailMutationQueue(),
      pluginData: harness.pluginData,
      refresh: { recoverFromMutationFailure: async () => undefined },
      runtimeStore: harness.runtimeStore,
    });
    await sync.submit(createTrailMutationPlan({
      commandId: "command-a",
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "triage.issue.create",
    }));
    expect(harness.runtimeStore.getState().committed.authoritative.domain.issuesById.get("triage-a"))
      .toEqual(issue);
    expect(harness.runtimeStore.getState().pending).toEqual([]);
  });

  it("settles same-identity Source Transition by releasing source ownership before target ownership", () => {
    const configuration = createTrailTestConfiguration();
    const workspaceState = createTrailTestWorkspaceState();
    const projectA = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    };
    const projectB = {
      id: "project-b",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project B",
    };
    const beforeIssue = {
      context: "workflow" as const,
      createdAt: 1,
      id: "issue-move",
      labelIds: [],
      projectId: projectA.id,
      statusDefinitionId: "issue-unstarted",
      title: "Move me",
    };
    const afterIssue = { ...beforeIssue, projectId: projectB.id };
    const committed = {
      ...buildTrailCommittedRuntimeCandidate({
        pluginData: { configuration, workspaceState },
        sources: [
          {
            issues: [beforeIssue],
            kind: "project" as const,
            milestones: [],
            project: projectA,
            sourcePath: "Trail/Projects/0001 Project A.md",
          },
          {
            issues: [],
            kind: "project" as const,
            milestones: [],
            project: projectB,
            sourcePath: "Trail/Projects/0002 Project B.md",
          },
        ],
      }),
      revision: 1,
    };
    const targetResult = {
      change: { kind: "mutated" as const },
      kind: "domain-source" as const,
      result: {
        issues: [],
        kind: "accepted" as const,
        snapshot: {
          issues: [afterIssue],
          kind: "project" as const,
          milestones: [],
          project: projectB,
          sourcePath: "Trail/Projects/0002 Project B.md",
        },
      },
    };
    const sourceResult = {
      change: { kind: "mutated" as const },
      kind: "domain-source" as const,
      result: {
        issues: [],
        kind: "accepted" as const,
        snapshot: {
          issues: [],
          kind: "project" as const,
          milestones: [],
          project: projectA,
          sourcePath: "Trail/Projects/0001 Project A.md",
        },
      },
    };
    const changes = runtimeChangesFromPersistenceResult({
      commandId: "move-command",
      operations: [targetResult, sourceResult],
      sourceOperations: [sourceResult],
      sourceRecovered: false,
      targetOperations: [targetResult],
      topology: "source-transition",
    });

    const candidate = buildTrailRuntimeCandidateAfterChanges({
      changes,
      committed,
      health: { sourceIssuesByPath: {} },
    });

    expect(candidate.committed.authoritative.domain.issuesById.get(afterIssue.id)).toEqual(afterIssue);
    expect(candidate.committed.ownership.sourceByEntityId.get(afterIssue.id)).toBe(
      "Trail/Projects/0002 Project B.md",
    );
  });

  it("clears failed optimistic state before invoking full authoritative recovery", async () => {
    const harness = readyHarness({ failMutate: true });
    const recoveredPendingCounts: number[] = [];
    const recover = vi.fn(async () => {
      recoveredPendingCounts.push(harness.runtimeStore.getState().pending.length);
    });
    const sync = createTrailAuthoritativeSourceSync({
      domainSources: harness.domainSources,
      mutationQueue: new TrailMutationQueue(),
      pluginData: harness.pluginData,
      refresh: { recoverFromMutationFailure: recover },
      runtimeStore: harness.runtimeStore,
    });
    const issue = {
      context: "triage" as const,
      due: 100,
      id: "triage-fail",
      labelIds: [],
      title: "Capture",
    };
    await expect(sync.submit(createTrailMutationPlan({
      commandId: "command-fail",
      effects: [{ after: { kind: "issue", value: issue }, kind: "create-entity" }],
      intent: "triage.issue.create",
    }))).rejects.toThrow("write failed");
    expect(recoveredPendingCounts).toEqual([0]);
  });
});
