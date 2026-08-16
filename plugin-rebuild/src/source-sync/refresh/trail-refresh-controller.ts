import type { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO } from "../../persistence/ports/trail-workspace-layout-io";
import { publishTrailCommittedRuntime } from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  setTrailRuntimeControl,
  setTrailRuntimeSourceIssues,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import { bootstrapFreshTrailWorkspace } from "../bootstrap/trail-workspace-bootstrap";
import { discoverTrailWorkspace } from "../discovery/trail-workspace-discovery";
import {
  loadTrailAuthoritativeRuntimeCandidate,
  TrailAuthoritativeLoadError,
} from "./trail-authoritative-loader";

export interface TrailManagedPersistenceEvent {
  readonly kind: "create" | "delete" | "modify" | "rename";
  readonly oldPath?: string;
  readonly path: string;
}

export interface TrailRefreshRecovery {
  readonly recoverFromMutationFailure: (error: unknown) => Promise<void>;
}

export class TrailRefreshError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TrailRefreshError";
  }
}

function isTrailSourceProblem(
  detail: TrailAuthoritativeLoadError["details"][number],
): detail is TrailSourceProblem {
  return "sourcePath" in detail;
}

/** Owns the only V1 unexpected-change ingress: serialized full authoritative reload. */
export class TrailRefreshController implements TrailRefreshRecovery {
  private refreshDirty = false;
  private externalRefreshPromise: Promise<void> | null = null;

  public constructor(private readonly options: {
    readonly createId: () => string;
    readonly domainSources: TrailDomainSourceRepository;
    readonly layout: TrailWorkspaceLayoutIO;
    readonly mutationQueue: TrailMutationQueue;
    readonly pluginData: TrailPluginDataRepository;
    readonly resolveHostTimezone: () => string;
    readonly runtimeStore: TrailRuntimeStore;
  }) {}

  public async initialize(): Promise<{ readonly bootstrapped: boolean }> {
    setTrailRuntimeControl(this.options.runtimeStore, { kind: "loading" });
    try {
      const discovery = await discoverTrailWorkspace(this.options);
      let bootstrapped = false;
      if (discovery.mode === "fresh") {
        await bootstrapFreshTrailWorkspace({
          createId: this.options.createId,
          domainSources: this.options.domainSources,
          layout: this.options.layout,
          pluginData: this.options.pluginData,
          timezone: this.options.resolveHostTimezone(),
        });
        bootstrapped = true;
      } else if (discovery.mode === "blocked") {
        throw new Error(discovery.blockers.map(({ message }) => message).join("; "));
      }
      await this.reloadAndPublish();
      setTrailRuntimeControl(this.options.runtimeStore, { kind: "ready" });
      return { bootstrapped };
    } catch (error: unknown) {
      this.failClosed(error);
      throw new TrailRefreshError("Trail initialization failed", error);
    }
  }

  public requestExternalRefresh(_event: TrailManagedPersistenceEvent): Promise<void> {
    this.refreshDirty = true;
    setTrailRuntimeControl(this.options.runtimeStore, { kind: "refreshing" });
    if (this.externalRefreshPromise !== null) return this.externalRefreshPromise;

    const queued = this.options.mutationQueue.enqueueAfterCurrent(async () => {
      try {
        let candidate;
        do {
          this.refreshDirty = false;
          candidate = await loadTrailAuthoritativeRuntimeCandidate(this.options);
        } while (this.refreshDirty);
        publishTrailCommittedRuntime(
          this.options.runtimeStore,
          candidate.committed,
          candidate.health,
        );
        setTrailRuntimeControl(this.options.runtimeStore, { kind: "ready" });
      } catch (error: unknown) {
        this.failClosed(error);
        throw new TrailRefreshError("External Trail refresh failed", error);
      }
    });
    this.externalRefreshPromise = queued.finally(() => {
      this.externalRefreshPromise = null;
    });
    return this.externalRefreshPromise;
  }

  /** Runs inside the failing mutation's queue slot, so it must not enqueue itself. */
  public async recoverFromMutationFailure(_error: unknown): Promise<void> {
    setTrailRuntimeControl(this.options.runtimeStore, { kind: "refreshing" });
    try {
      await this.reloadAndPublish();
      // A previously queued host refresh must keep the mutation gate closed until it runs.
      if (this.externalRefreshPromise === null) {
        setTrailRuntimeControl(this.options.runtimeStore, { kind: "ready" });
      }
    } catch (recoveryError: unknown) {
      this.failClosed(recoveryError);
      throw new TrailRefreshError("Trail mutation recovery refresh failed", recoveryError);
    }
  }

  private async reloadAndPublish(): Promise<void> {
    const candidate = await loadTrailAuthoritativeRuntimeCandidate(this.options);
    publishTrailCommittedRuntime(
      this.options.runtimeStore,
      candidate.committed,
      candidate.health,
    );
  }

  private failClosed(error: unknown): void {
    if (error instanceof TrailAuthoritativeLoadError) {
      const grouped = new Map<string, TrailSourceProblem[]>();
      for (const detail of error.details) {
        if (!isTrailSourceProblem(detail)) continue;
        const current = grouped.get(detail.sourcePath) ?? [];
        grouped.set(detail.sourcePath, [...current, detail]);
      }
      for (const [sourcePath, details] of grouped) {
        setTrailRuntimeSourceIssues(this.options.runtimeStore, sourcePath, details);
      }
    }
    setTrailRuntimeControl(this.options.runtimeStore, {
      kind: "read-only-error",
      message: error instanceof Error ? error.message : "Trail authoritative refresh failed",
    });
  }
}
