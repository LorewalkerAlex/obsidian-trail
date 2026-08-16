import { describe, expect, it, vi } from "vitest";

import {
  createDefaultTrailPluginData,
  type TrailPluginData,
} from "../../domain/trail-configuration";
import { createTrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import {
  createTrailRuntimeStore,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import type {
  WorkspaceBootstrapGateway,
  WorkspaceProbe,
} from "../bootstrap/trail-workspace-bootstrap";
import { createTrailRefreshController } from "./trail-refresh-controller";


function createDeferred(): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createPluginData(timezone: string): TrailPluginData {
  let id = 0;
  return createDefaultTrailPluginData({
    createId: () => `${timezone}:status-${id += 1}`,
    timezone,
  });
}

function existingProbe(pluginData: TrailPluginData): WorkspaceProbe {
  return {
    markdown: {
      existingPaths: [
        "Trail/Collections",
        "Trail/Initiatives",
        "Trail/Projects",
        "Trail/Collections/Triage.md",
        "Trail/Collections/Projectless Issues.md",
        "Trail/Collections/Cycles.md",
      ],
      invalidFormalPaths: [],
      rootKind: "directory",
      topLevelEntries: [
        { kind: "directory", name: "Collections" },
        { kind: "directory", name: "Initiatives" },
        { kind: "directory", name: "Projects" },
      ],
      trailExists: true,
    },
    pluginData: { exists: true, value: pluginData },
  };
}

class MutableWorkspaceGateway implements WorkspaceBootstrapGateway {
  public probe: WorkspaceProbe;

  public constructor(pluginData: TrailPluginData) {
    this.probe = existingProbe(pluginData);
  }

  public async createDirectory(): Promise<void> {
    throw new Error("Fresh bootstrap is not expected in this fixture");
  }
  public async createFile(): Promise<void> {
    throw new Error("Fresh bootstrap is not expected in this fixture");
  }
  public async deleteFile(): Promise<void> {
    throw new Error("Fresh rollback is not expected in this fixture");
  }
  public async loadPluginData() {
    return this.probe.pluginData;
  }
  public async probeWorkspace(): Promise<WorkspaceProbe> {
    return this.probe;
  }
  public async readFile(): Promise<string> {
    throw new Error("Fresh verification is not expected in this fixture");
  }
  public async removeDirectoryIfEmpty(): Promise<void> {
    throw new Error("Fresh rollback is not expected in this fixture");
  }
  public async savePluginData(): Promise<void> {
    throw new Error("Fresh bootstrap is not expected in this fixture");
  }
}

function createHarness(pluginData = createPluginData("Asia/Singapore")) {
  const runtimeStore = createTrailRuntimeStore();
  const workspace = new MutableWorkspaceGateway(pluginData);
  const activateSources = vi.fn();
  const clearSources = vi.fn();
  const mutationQueue = new TrailMutationQueue();
  let failNextSourceLoad = false;
  let invalidateNextSourceLoad = false;

  const controller = createTrailRefreshController({
    activateSources,
    clearSources,
    createId: () => "bootstrap-id",
    createSourceSyncs: (store: TrailRuntimeStore) => ({
      triage: {
        initialize: async () => undefined,
      },
      workflow: {
        initialize: async () => {
          if (failNextSourceLoad) {
            failNextSourceLoad = false;
            throw new Error("simulated source load failure");
          }
          if (invalidateNextSourceLoad) {
            invalidateNextSourceLoad = false;
            setSourceIssuesForPath(store, "Trail/Projects", [{
              code: "test.invalid-source",
              filePath: "Trail/Projects",
              message: "invalid source fixture",
              scope: "file",
            }]);
          }
        },
      },
    }),
    mutationQueue,
    resolveHostTimezone: () => "UTC",
    runtimeStore,
    workspace,
  });

  return {
    activateSources,
    clearSources,
    controller,
    failNextSourceLoad: () => {
      failNextSourceLoad = true;
    },
    invalidateNextSourceLoad: () => {
      invalidateNextSourceLoad = true;
    },
    mutationQueue,
    runtimeStore,
    workspace,
  };
}

describe("Trail full refresh controller", () => {
  it("loads Configuration and Workspace State into one ready authoritative snapshot", async () => {
    const pluginData = createPluginData("Asia/Singapore");
    const harness = createHarness(pluginData);

    const classification = await harness.controller.initialize();

    expect(classification.canLoad).toBe(true);
    expect(harness.runtimeStore.getState().committed.authoritative.configuration)
      .toBe(pluginData.configuration);
    expect(harness.runtimeStore.getState().committed.authoritative.workspaceState)
      .toBe(pluginData.workspaceState);
    expect(harness.runtimeStore.getState().control).toEqual({
      kind: "ready",
      timezone: "Asia/Singapore",
    });
    expect(harness.activateSources).toHaveBeenCalledOnce();
  });

  it("fails closed before source loading when the managed workspace becomes incomplete", async () => {
    const harness = createHarness();
    harness.workspace.probe = {
      ...harness.workspace.probe,
      markdown: {
        ...harness.workspace.probe.markdown,
        existingPaths: [
          "Trail/Collections",
          "Trail/Initiatives",
          "Trail/Projects",
          "Trail/Collections/Projectless Issues.md",
          "Trail/Collections/Cycles.md",
        ],
      },
    };

    const classification = await harness.controller.initialize();

    expect(classification.canLoad).toBe(false);
    expect(harness.activateSources).not.toHaveBeenCalled();
    expect(harness.runtimeStore.getState().control.kind).toBe("read-only-error");
  });

  it("keeps the last-known-good committed snapshot when an external full reload fails", async () => {
    const initial = createPluginData("Asia/Singapore");
    const harness = createHarness(initial);
    await harness.controller.initialize();
    const committedBefore = harness.runtimeStore.getState().committed;

    harness.workspace.probe = existingProbe(createPluginData("Asia/Tokyo"));
    harness.failNextSourceLoad();

    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: "Trail/Collections/Triage.md",
    })).rejects.toThrow("simulated source load failure");

    const state = harness.runtimeStore.getState();
    expect(state.committed).toBe(committedBefore);
    expect(state.committed.authoritative.configuration).toBe(initial.configuration);
    expect(state.control).toMatchObject({
      kind: "read-only-error",
      timezone: "Asia/Singapore",
    });
    expect(harness.activateSources).toHaveBeenCalledTimes(1);
  });

  it("rejects a candidate with source health issues without partially publishing it", async () => {
    const harness = createHarness();
    await harness.controller.initialize();
    const committedBefore = harness.runtimeStore.getState().committed;
    harness.invalidateNextSourceLoad();

    await expect(harness.controller.requestExternalRefresh({
      kind: "modify",
      path: "Trail/Projects/0001 Project.md",
    })).rejects.toThrow("Formal sources failed validation");

    expect(harness.runtimeStore.getState().committed).toBe(committedBefore);
    expect(harness.runtimeStore.getState().health.sourceIssuesByPath).toEqual({});
  });

  it("publishes a later valid external reload and replaces the active source session", async () => {
    const harness = createHarness(createPluginData("Asia/Singapore"));
    await harness.controller.initialize();
    const updated = createPluginData("Asia/Tokyo");
    harness.workspace.probe = existingProbe(updated);

    await harness.controller.requestExternalRefresh({
      kind: "rename",
      oldPath: "Trail/Projects/0001 Old.md",
      path: "Trail/Projects/0001 New.md",
    });

    const state = harness.runtimeStore.getState();
    expect(state.committed.authoritative.configuration).toBe(updated.configuration);
    expect(state.committed.authoritative.workspaceState).toBe(updated.workspaceState);
    expect(state.control).toEqual({ kind: "ready", timezone: "Asia/Tokyo" });
    expect(harness.activateSources).toHaveBeenCalledTimes(2);
  });


  it("re-reads before publish when another managed event arrives during refresh", async () => {
    const harness = createHarness(createPluginData("Asia/Singapore"));
    await harness.controller.initialize();
    const firstUpdate = createPluginData("Asia/Tokyo");
    const latestUpdate = createPluginData("Asia/Seoul");
    const firstProbeStarted = createDeferred();
    const releaseFirstProbe = createDeferred();
    let probeCalls = 0;

    vi.spyOn(harness.workspace, "probeWorkspace").mockImplementation(async () => {
      probeCalls += 1;
      if (probeCalls === 1) {
        firstProbeStarted.resolve();
        await releaseFirstProbe.promise;
        return existingProbe(firstUpdate);
      }
      return existingProbe(latestUpdate);
    });

    const firstRefresh = harness.controller.requestExternalRefresh({
      kind: "modify",
      path: "Trail/Collections/Triage.md",
    });
    await firstProbeStarted.promise;
    const secondRefresh = harness.controller.requestExternalRefresh({
      kind: "modify",
      path: "Trail/Collections/Cycles.md",
    });

    releaseFirstProbe.resolve();
    await Promise.all([firstRefresh, secondRefresh]);

    const state = harness.runtimeStore.getState();
    expect(probeCalls).toBe(2);
    expect(state.committed.authoritative.configuration).toBe(
      latestUpdate.configuration,
    );
    expect(state.committed.authoritative.workspaceState).toBe(
      latestUpdate.workspaceState,
    );
    expect(state.control).toEqual({ kind: "ready", timezone: "Asia/Seoul" });
    expect(harness.activateSources).toHaveBeenCalledTimes(2);
  });

  it("queues external refresh behind in-flight mutation work before publishing", async () => {
    const harness = createHarness(createPluginData("Asia/Singapore"));
    await harness.controller.initialize();
    const mutationStarted = createDeferred();
    const releaseMutation = createDeferred();
    const pendingPlan = createTrailMutationPlan({
      commandId: "pending-command",
      effects: [],
      intent: "test.pending",
    });
    harness.runtimeStore.setState({ pending: [pendingPlan] });

    const mutation = harness.mutationQueue.enqueue(async () => {
      mutationStarted.resolve();
      await releaseMutation.promise;
      harness.runtimeStore.setState({ pending: [] });
    }, {
      correlationId: "pending-command",
      kind: "test.pending",
    });
    await mutationStarted.promise;

    const refresh = harness.controller.requestExternalRefresh({
      kind: "modify",
      path: "Trail/Projects/0001 Project.md",
    });

    expect(harness.runtimeStore.getState().control).toEqual({
      kind: "refreshing",
      timezone: "Asia/Singapore",
    });
    expect(harness.activateSources).toHaveBeenCalledTimes(1);

    releaseMutation.resolve();
    await mutation;
    await refresh;

    expect(harness.runtimeStore.getState().pending).toEqual([]);
    expect(harness.runtimeStore.getState().control).toEqual({
      kind: "ready",
      timezone: "Asia/Singapore",
    });
    expect(harness.activateSources).toHaveBeenCalledTimes(2);
  });
});