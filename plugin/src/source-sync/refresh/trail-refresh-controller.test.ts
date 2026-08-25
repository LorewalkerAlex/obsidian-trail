import { describe, expect, it } from "vitest";

import {
  TRAIL_COLLECTIONS_PATH,
  TRAIL_CYCLES_PATH,
  TRAIL_INITIATIVES_PATH,
  TRAIL_MANAGED_ROOT,
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-paths";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO } from "../../persistence/ports/trail-workspace-layout-io";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { TrailRefreshController } from "./trail-refresh-controller";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function pluginData(timezone: string): TrailPluginDataSnapshot {
  const configuration = createTrailTestConfiguration();
  return {
    configuration: { ...configuration, temporal: { timezone } },
    workspaceState: createTrailTestWorkspaceState(),
  };
}

function createHarness() {
  const runtimeStore = createTrailRuntimeStore();
  const mutationQueue = new TrailMutationQueue();
  let currentPluginData = pluginData("Asia/Singapore");
  let failNextRead = false;
  let sourceIssueNextRead = false;
  let blockNextTriageRead: ReturnType<typeof deferred> | undefined;
  let triageReadStarted: ReturnType<typeof deferred> | undefined;

  const layout: TrailWorkspaceLayoutIO = {
    createDirectory: async () => undefined,
    pathKind: async (path) => {
      if ([TRAIL_MANAGED_ROOT, TRAIL_INITIATIVES_PATH, TRAIL_PROJECTS_PATH, TRAIL_COLLECTIONS_PATH].includes(path as never)) {
        return "directory";
      }
      if ([TRAIL_TRIAGE_PATH, TRAIL_CYCLES_PATH].includes(path as never)) {
        return "file";
      }
      return "missing";
    },
    removeDirectoryIfEmpty: async () => undefined,
  };
  const domainSources = {
    async list(path: string) {
      if (path === TRAIL_MANAGED_ROOT) return [
        { kind: "directory" as const, name: "Initiatives", path: TRAIL_INITIATIVES_PATH },
        { kind: "directory" as const, name: "Projects", path: TRAIL_PROJECTS_PATH },
        { kind: "directory" as const, name: "Collections", path: TRAIL_COLLECTIONS_PATH },
      ];
      if (path === TRAIL_COLLECTIONS_PATH) return [
        { kind: "file" as const, name: "Triage.md", path: TRAIL_TRIAGE_PATH },
        { kind: "file" as const, name: "Cycles.md", path: TRAIL_CYCLES_PATH },
      ];
      return [];
    },
    async read(kind: string, path: string) {
      if (failNextRead) {
        failNextRead = false;
        throw new Error("simulated source read failure");
      }
      if (path === TRAIL_TRIAGE_PATH && blockNextTriageRead !== undefined) {
        const release = blockNextTriageRead;
        blockNextTriageRead = undefined;
        triageReadStarted?.resolve();
        await release.promise;
      }
      const issues = sourceIssueNextRead && path === TRAIL_TRIAGE_PATH
        ? [{
            code: "test.invalid",
            message: "invalid source fixture",
            scope: "source" as const,
            severity: "error" as const,
            sourcePath: path,
            stage: "physical" as const,
          }]
        : [];
      if (sourceIssueNextRead && path === TRAIL_TRIAGE_PATH) sourceIssueNextRead = false;
      if (kind === "triage") return { issues, kind: "accepted" as const, snapshot: { issues: [], kind: "triage" as const, sourcePath: path } };
      if (kind === "cycles") return { issues: [], kind: "accepted" as const, snapshot: { cycles: [], kind: "cycles" as const, sourcePath: path } };
      throw new Error(`unexpected source kind: ${kind}`);
    },
  } as unknown as TrailDomainSourceRepository;
  const pluginDataRepository = {
    read: async () => ({ kind: "valid" as const, snapshot: currentPluginData }),
    save: async (snapshot: TrailPluginDataSnapshot) => {
      currentPluginData = snapshot;
      return snapshot;
    },
  } as TrailPluginDataRepository;
  const controller = new TrailRefreshController({
    createId: () => "bootstrap-id",
    domainSources,
    layout,
    mutationQueue,
    pluginData: pluginDataRepository,
    resolveHostTimezone: () => "UTC",
    runtimeStore,
  });
  return {
    blockNextRead() {
      const release = deferred();
      blockNextTriageRead = release;
      triageReadStarted = deferred();
      return { release, started: triageReadStarted };
    },
    controller,
    failNextRead: () => { failNextRead = true; },
    invalidateNextRead: () => { sourceIssueNextRead = true; },
    mutationQueue,
    runtimeStore,
    setPluginData: (value: TrailPluginDataSnapshot) => { currentPluginData = value; },
  };
}

describe("Trail full refresh controller", () => {
  it("initializes one complete ready Runtime snapshot", async () => {
    const harness = createHarness();
    await expect(harness.controller.initialize()).resolves.toEqual({ bootstrapped: false });
    expect(harness.runtimeStore.getState().control).toEqual({ kind: "ready" });
    expect(harness.runtimeStore.getState().committed.authoritative.configuration?.temporal.timezone)
      .toBe("Asia/Singapore");
  });

  it("retains last-known-good committed state when an external full reload fails", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const committedBefore = harness.runtimeStore.getState().committed;
    harness.setPluginData(pluginData("Asia/Tokyo"));
    harness.failNextRead();

    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: TRAIL_TRIAGE_PATH,
    })).rejects.toThrow("External Trail refresh failed");
    expect(harness.runtimeStore.getState().committed).toBe(committedBefore);
    expect(harness.runtimeStore.getState().control.kind).toBe("read-only-error");
  });

  it("rejects source-health candidates without partially publishing them", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const committedBefore = harness.runtimeStore.getState().committed;
    harness.invalidateNextRead();
    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: TRAIL_TRIAGE_PATH,
    })).rejects.toThrow("External Trail refresh failed");
    expect(harness.runtimeStore.getState().committed).toBe(committedBefore);
    expect(harness.runtimeStore.getState().health.sourceIssuesByPath[TRAIL_TRIAGE_PATH])
      .toMatchObject([{ code: "test.invalid", sourcePath: TRAIL_TRIAGE_PATH }]);
  });

  it("reruns discovery/read when another managed event arrives during refresh", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    harness.setPluginData(pluginData("Asia/Tokyo"));
    const blocked = harness.blockNextRead();
    const first = harness.controller.requestExternalRefresh({ kind: "modify", path: TRAIL_TRIAGE_PATH });
    await blocked.started.promise;
    harness.setPluginData(pluginData("Asia/Seoul"));
    const second = harness.controller.requestExternalRefresh({ kind: "modify", path: TRAIL_CYCLES_PATH });
    blocked.release.resolve();
    await Promise.all([first, second]);
    expect(harness.runtimeStore.getState().committed.authoritative.configuration?.temporal.timezone)
      .toBe("Asia/Seoul");
  });

  it("runs the refresh barrier before mutations that were queued but not started", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const revisionBefore = harness.runtimeStore.getState().committed.revision;
    harness.setPluginData(pluginData("Asia/Tokyo"));
    const events: string[] = [];
    let queuedObservation: {
      readonly controlKind: string;
      readonly revision: number;
      readonly timezone: string | undefined;
    } | undefined;
    const release = deferred();
    const started = deferred();
    const current = harness.mutationQueue.enqueue(async () => {
      events.push("current:start");
      started.resolve();
      await release.promise;
      events.push("current:end");
    });
    await started.promise;
    const queued = harness.mutationQueue.enqueue(async () => {
      const state = harness.runtimeStore.getState();
      queuedObservation = {
        controlKind: state.control.kind,
        revision: state.committed.revision,
        timezone: state.committed.authoritative.configuration?.temporal.timezone,
      };
      events.push("queued");
    });
    const refresh = harness.controller.requestExternalRefresh({
      kind: "modify",
      path: TRAIL_TRIAGE_PATH,
    });

    release.resolve();
    await Promise.all([current, queued, refresh]);
    expect(events).toEqual(["current:start", "current:end", "queued"]);
    expect(queuedObservation).toEqual({
      controlKind: "ready",
      revision: revisionBefore + 1,
      timezone: "Asia/Tokyo",
    });
  });

  it("queues host refresh behind in-flight mutation work while closing the write gate immediately", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const release = deferred();
    const started = deferred();
    const mutation = harness.mutationQueue.enqueue(async () => {
      started.resolve();
      await release.promise;
    });
    await started.promise;
    const refresh = harness.controller.requestExternalRefresh({ kind: "modify", path: TRAIL_TRIAGE_PATH });
    expect(harness.runtimeStore.getState().control).toEqual({ kind: "refreshing" });
    release.resolve();
    await mutation;
    await refresh;
    expect(harness.runtimeStore.getState().control).toEqual({ kind: "ready" });
  });

  it("recovers from read-only-error when a later external reload is valid", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const revisionBefore = harness.runtimeStore.getState().committed.revision;

    harness.invalidateNextRead();
    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: TRAIL_TRIAGE_PATH,
    })).rejects.toThrow("External Trail refresh failed");

    const failedState = harness.runtimeStore.getState();
    expect(failedState.control.kind).toBe("read-only-error");
    expect(failedState.committed.revision).toBe(revisionBefore);
    expect(failedState.health.sourceIssuesByPath[TRAIL_TRIAGE_PATH])
      .toMatchObject([{ code: "test.invalid" }]);

    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: TRAIL_TRIAGE_PATH,
    })).resolves.toBeUndefined();

    const recoveredState = harness.runtimeStore.getState();
    expect(recoveredState.control).toEqual({ kind: "ready" });
    expect(recoveredState.committed.revision).toBe(revisionBefore + 1);
    expect(recoveredState.health.sourceIssuesByPath).toEqual({});
  });
});
