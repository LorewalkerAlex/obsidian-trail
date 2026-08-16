import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailConfiguration } from "../../domain/trail-configuration";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import { setTrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import {
  createTrailReloadCandidate,
  createTrailRuntimeStore,
  publishTrailReloadCandidate,
  selectAllSourceIssues,
  setTrailRuntimeConfiguration,
  setTrailRuntimeWorkspaceState,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import {
  classifyWorkspace,
  executeFreshWorkspaceBootstrap,
  type WorkspaceBootstrapGateway,
  type WorkspaceClassification,
} from "../bootstrap/trail-workspace-bootstrap";

export interface TrailInitializableSourcePair {
  readonly triage: {
    readonly initialize: (correlationId?: string) => Promise<void>;
  };
  readonly workflow: {
    readonly initialize: (correlationId?: string) => Promise<void>;
  };
}

export type TrailManagedPersistenceEvent =
  | { readonly kind: "create" | "delete" | "modify"; readonly path: string }
  | { readonly kind: "rename"; readonly oldPath: string; readonly path: string };

export interface TrailRefreshController {
  readonly dispose: () => void;
  readonly initialize: () => Promise<WorkspaceClassification>;
  readonly requestExternalRefresh: (event: TrailManagedPersistenceEvent) => Promise<void>;
}

interface ReloadResult<TSources extends TrailInitializableSourcePair> {
  readonly candidate: ReturnType<typeof createTrailReloadCandidate>;
  readonly classification: WorkspaceClassification;
  readonly configuration: TrailConfiguration;
  readonly sources: TSources;
  readonly timezone: string;
}

export class TrailRefreshError extends Error {
  public constructor(
    readonly code: "blocked" | "disposed" | "pending" | "source-invalid",
    message: string,
  ) {
    super(message);
    this.name = "TrailRefreshError";
  }
}

function blockerMessage(classification: WorkspaceClassification): string {
  return classification.blockers.length > 0
    ? classification.blockers.join(", ")
    : `workspace mode: ${classification.mode}`;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

/**
 * Creates the single startup/external-refresh owner. Candidate data is built in a
 * staging Runtime and only published to the live Runtime after complete validation.
 */
export function createTrailRefreshController<
  TSources extends TrailInitializableSourcePair,
>(dependencies: {
  readonly activateSources: (
    configuration: TrailConfiguration,
    sources: TSources,
  ) => void;
  readonly clearSources: () => void;
  readonly createId: () => string;
  readonly createSourceSyncs: (
    runtimeStore: TrailRuntimeStore,
    configuration: TrailConfiguration,
  ) => TSources;
  readonly diagnostics?: TrailDiagnostics;
  readonly mutationQueue: TrailMutationQueue;
  readonly resolveHostTimezone: () => string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly workspace: WorkspaceBootstrapGateway;
}): TrailRefreshController {
  const diagnostics = dependencies.diagnostics ?? NOOP_TRAIL_DIAGNOSTICS;
  let disposed = false;
  let refreshDirty = false;
  let refreshPromise: Promise<void> | null = null;

  const assertActive = (): void => {
    if (disposed) {
      throw new TrailRefreshError("disposed", "Trail refresh controller is disposed");
    }
  };

  const recordClassification = (
    correlationId: string,
    classification: WorkspaceClassification,
  ): void => {
    diagnostics.record("workspace.classified", {
      correlationId,
      data: {
        blockerCount: classification.blockers.length,
        canBootstrap: classification.canBootstrap,
        canLoad: classification.canLoad,
        mode: classification.mode,
        pluginDataKind: classification.pluginData.kind,
      },
    });
  };

  const loadExistingCandidate = async (
    correlationId: string,
  ): Promise<ReloadResult<TSources>> => {
    assertActive();
    const classification = classifyWorkspace(await dependencies.workspace.probeWorkspace());
    recordClassification(correlationId, classification);
    if (!classification.canLoad || classification.pluginData.kind !== "valid") {
      throw new TrailRefreshError(
        "blocked",
        `Trail cannot load the Formal workspace: ${blockerMessage(classification)}`,
      );
    }

    const pluginData = classification.pluginData.data;
    const configuration = pluginData.configuration;
    const stagingStore = createTrailRuntimeStore();
    setTrailRuntimeConfiguration(stagingStore, configuration);
    setTrailRuntimeWorkspaceState(stagingStore, pluginData.workspaceState);
    const stagingSources = dependencies.createSourceSyncs(stagingStore, configuration);

    await stagingSources.triage.initialize(correlationId);
    await stagingSources.workflow.initialize(correlationId);
    assertActive();

    const sourceIssues = selectAllSourceIssues(stagingStore.getState());
    if (sourceIssues.length > 0) {
      throw new TrailRefreshError(
        "source-invalid",
        `Formal sources failed validation: ${sourceIssues.map((issue) => issue.code).join(", ")}`,
      );
    }

    const liveSources = dependencies.createSourceSyncs(
      dependencies.runtimeStore,
      configuration,
    );
    return {
      candidate: createTrailReloadCandidate(stagingStore.getState()),
      classification,
      configuration,
      sources: liveSources,
      timezone: configuration.temporal.timezone,
    };
  };

  const publish = (result: ReloadResult<TSources>, correlationId: string): void => {
    assertActive();
    if (dependencies.runtimeStore.getState().pending.length > 0) {
      throw new TrailRefreshError(
        "pending",
        "Full refresh reached publish while optimistic mutations were still pending",
      );
    }

    dependencies.activateSources(result.configuration, result.sources);
    publishTrailReloadCandidate(
      dependencies.runtimeStore,
      result.candidate,
      result.timezone,
    );
    diagnostics.record("refresh.published", {
      correlationId,
      data: {
        committedRevision: dependencies.runtimeStore.getState().committed.revision,
        timezone: result.timezone,
      },
    });
  };

  const initialize = async (): Promise<WorkspaceClassification> => {
    assertActive();
    const correlationId = diagnostics.createCorrelationId("initialize");
    diagnostics.record("refresh.initialize.started", { correlationId });
    dependencies.clearSources();
    setTrailRuntimeControl(dependencies.runtimeStore, { kind: "loading" });

    try {
      let classification = classifyWorkspace(await dependencies.workspace.probeWorkspace());
      recordClassification(correlationId, classification);

      if (classification.canBootstrap) {
        const timezone = dependencies.resolveHostTimezone();
        diagnostics.record("workspace.bootstrap.started", {
          correlationId,
          data: { timezone },
        });
        await executeFreshWorkspaceBootstrap(dependencies.workspace, {
          createId: dependencies.createId,
          timezone,
        });
        diagnostics.record("workspace.bootstrap.completed", { correlationId });
        classification = classifyWorkspace(await dependencies.workspace.probeWorkspace());
        recordClassification(correlationId, classification);
      }

      if (!classification.canLoad || classification.pluginData.kind !== "valid") {
        const message = blockerMessage(classification);
        setTrailRuntimeControl(dependencies.runtimeStore, {
          kind: "read-only-error",
          message: `Trail cannot load the Formal workspace: ${message}`,
        });
        diagnostics.record("refresh.initialize.blocked", {
          correlationId,
          data: {
            blockerCount: classification.blockers.length,
            mode: classification.mode,
          },
          level: "warn",
        });
        return classification;
      }

      const result = await loadExistingCandidate(correlationId);
      publish(result, correlationId);
      diagnostics.record("refresh.initialize.completed", {
        correlationId,
        data: {
          projectCount: Object.keys(
            dependencies.runtimeStore.getState().committed.authoritative.domain.projectsById,
          ).length,
          timezone: result.timezone,
        },
      });
      return result.classification;
    } catch (error: unknown) {
      dependencies.clearSources();
      setTrailRuntimeControl(dependencies.runtimeStore, {
        kind: "read-only-error",
        message: error instanceof Error ? error.message : "Trail initialization failed",
      });
      diagnostics.record("refresh.initialize.failed", {
        correlationId,
        data: { errorName: errorName(error) },
        level: "error",
      });
      throw error;
    }
  };

  const runExternalRefresh = async (
    correlationId: string,
  ): Promise<void> => {
    let result: ReloadResult<TSources>;
    do {
      refreshDirty = false;
      result = await loadExistingCandidate(correlationId);
    } while (refreshDirty);

    publish(result, correlationId);
  };

  const requestExternalRefresh = (event: TrailManagedPersistenceEvent): Promise<void> => {
    assertActive();
    refreshDirty = true;
    if (refreshPromise !== null) {
      return refreshPromise;
    }

    const correlationId = diagnostics.createCorrelationId("external-refresh");
    const timezone = dependencies.runtimeStore.getState().committed.authoritative
      .configuration?.temporal.timezone;
    setTrailRuntimeControl(
      dependencies.runtimeStore,
      timezone === undefined
        ? {
            kind: "read-only-error",
            message: "Trail cannot refresh before an authoritative configuration is loaded",
          }
        : { kind: "refreshing", timezone },
    );
    diagnostics.record("refresh.external.enqueued", {
      correlationId,
      data: {
        eventKind: event.kind,
        oldPath: event.kind === "rename" ? event.oldPath : null,
        path: event.path,
      },
    });

    const queued = dependencies.mutationQueue.enqueue(
      async () => runExternalRefresh(correlationId),
      { correlationId, kind: "refresh.external" },
    );
    refreshPromise = queued
      .catch((error: unknown) => {
        const lastKnownTimezone = dependencies.runtimeStore.getState().committed
          .authoritative.configuration?.temporal.timezone;
        setTrailRuntimeControl(dependencies.runtimeStore, {
          kind: "read-only-error",
          message: error instanceof Error
            ? `Trail refresh failed: ${error.message}`
            : "Trail refresh failed",
          timezone: lastKnownTimezone,
        });
        diagnostics.record("refresh.external.failed", {
          correlationId,
          data: { errorName: errorName(error) },
          level: "error",
        });
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  return {
    dispose(): void {
      disposed = true;
      refreshDirty = false;
    },
    initialize,
    requestExternalRefresh,
  };
}