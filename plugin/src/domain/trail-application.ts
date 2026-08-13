import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import { TrailMutationQueue } from "./trail-mutation-queue";
import { TRAIL_TRIAGE_PATH } from "./trail-physical-schema";
import {
  classifyWorkspace,
  executeFreshWorkspaceBootstrap,
  type WorkspaceBootstrapGateway,
  type WorkspaceClassification,
} from "./trail-workspace";
import {
  setTrailRuntimeAvailability,
  type TrailRuntimeStore,
} from "./trail-runtime";
import { addCalendarDaysInTimeZone } from "./trail-temporal";
import {
  TrailTriageIntakeService,
  type TriageCaptureReceipt,
  type TrailTriagePersistenceGateway,
} from "./trail-triage-intake";

export type TrailApplicationErrorCode =
  | "not-ready"
  | "triage-invalid";

export class TrailApplicationError extends Error {
  public constructor(
    readonly code: TrailApplicationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailApplicationError";
  }
}

export interface TrailApplicationDependencies {
  readonly createId: () => string;
  readonly diagnostics?: TrailDiagnostics;
  readonly mutationQueue: TrailMutationQueue;
  readonly now: () => number;
  readonly persistence: TrailTriagePersistenceGateway;
  readonly resolveHostTimezone: () => string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly workspace: WorkspaceBootstrapGateway;
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
 * Composition-independent Formal application layer. It owns startup/bootstrap,
 * creates the Triage Intake service only after Configuration is trustworthy, and
 * exposes UI-facing capture/refresh actions without leaking Obsidian host APIs.
 */
export class TrailApplication {
  private intake: TrailTriageIntakeService | null = null;
  private readonly diagnostics: TrailDiagnostics;

  public constructor(
    private readonly dependencies: TrailApplicationDependencies,
  ) {
    this.diagnostics = dependencies.diagnostics ?? NOOP_TRAIL_DIAGNOSTICS;
  }

  public async initialize(): Promise<WorkspaceClassification> {
    const operationId = this.diagnostics.createCorrelationId("initialize");
    const {
      createId,
      mutationQueue,
      now,
      persistence,
      resolveHostTimezone,
      runtimeStore,
      workspace,
    } = this.dependencies;

    this.diagnostics.record("application.initialize.started", {
      correlationId: operationId,
    });
    setTrailRuntimeAvailability(runtimeStore, { kind: "initializing" });

    try {
      let classification = classifyWorkspace(await workspace.probeWorkspace());
      this.recordClassification(operationId, classification);

      if (classification.canBootstrap) {
        const timezone = resolveHostTimezone();
        this.diagnostics.record("workspace.bootstrap.started", {
          correlationId: operationId,
          data: { timezone },
        });
        await executeFreshWorkspaceBootstrap(workspace, {
          createId,
          timezone,
        });
        this.diagnostics.record("workspace.bootstrap.completed", {
          correlationId: operationId,
        });
        classification = classifyWorkspace(await workspace.probeWorkspace());
        this.recordClassification(operationId, classification);
      }

      if (!classification.canLoad || classification.pluginData.kind !== "valid") {
        this.intake = null;
        const message = blockerMessage(classification);
        setTrailRuntimeAvailability(runtimeStore, {
          kind: "blocked",
          message: `Trail cannot load the Formal workspace: ${message}`,
        });
        this.diagnostics.record("application.initialize.blocked", {
          correlationId: operationId,
          data: {
            blockerCount: classification.blockers.length,
            mode: classification.mode,
          },
          level: "warn",
        });
        return classification;
      }

      const timezone = classification.pluginData.data.configuration.temporal.timezone;
      const intake = new TrailTriageIntakeService(
        runtimeStore,
        mutationQueue,
        persistence,
        {
          createId,
          now,
          resolveDefaultDue: (effectiveAt) =>
            addCalendarDaysInTimeZone(effectiveAt, timezone, 7),
        },
        this.diagnostics,
      );

      this.diagnostics.record("triage.initialize.started", {
        correlationId: operationId,
      });
      await intake.initialize(operationId);
      this.intake = intake;
      setTrailRuntimeAvailability(runtimeStore, {
        kind: "ready",
        timezone,
      });
      this.diagnostics.record("application.ready", {
        correlationId: operationId,
        data: {
          committedRevision: runtimeStore.getState().committed.revision,
          timezone,
          triageCount: runtimeStore.getState().committed.triageIssueIds.length,
        },
      });
      return classification;
    } catch (error: unknown) {
      this.intake = null;
      setTrailRuntimeAvailability(runtimeStore, {
        kind: "error",
        message: error instanceof Error
          ? error.message
          : "Trail initialization failed",
      });
      this.diagnostics.record("application.initialize.failed", {
        correlationId: operationId,
        data: { errorName: errorName(error) },
        level: "error",
      });
      throw error;
    }
  }

  public capture(title: string): TriageCaptureReceipt {
    const state = this.dependencies.runtimeStore.getState();
    this.diagnostics.record("application.capture.requested", {
      data: {
        availability: state.availability.kind,
        titleLength: title.length,
      },
    });

    if (state.availability.kind !== "ready" || this.intake === null) {
      this.diagnostics.record("application.capture.rejected", {
        data: { reason: "not-ready" },
        level: "warn",
      });
      throw new TrailApplicationError(
        "not-ready",
        "Trail is not ready for Quick Capture",
      );
    }
    if (state.committed.sourceIssues.length > 0) {
      this.diagnostics.record("application.capture.rejected", {
        data: {
          reason: "triage-invalid",
          sourceIssueCount: state.committed.sourceIssues.length,
        },
        level: "warn",
      });
      throw new TrailApplicationError(
        "triage-invalid",
        "Quick Capture is paused until Triage.md is valid again",
      );
    }

    return this.intake.capture({ title });
  }

  public async refreshTriage(correlationId?: string): Promise<boolean> {
    const operationId = correlationId
      ?? this.diagnostics.createCorrelationId("triage.refresh");
    if (this.intake === null) {
      this.diagnostics.record("triage.refresh.skipped", {
        correlationId: operationId,
        data: { reason: "intake-unavailable" },
        level: "warn",
      });
      return false;
    }

    this.diagnostics.record("triage.refresh.enqueued", {
      correlationId: operationId,
    });
    return this.dependencies.mutationQueue.enqueue(
      () => this.intake?.refreshFromPersistence(operationId) ?? Promise.resolve(false),
      {
        correlationId: operationId,
        kind: "triage.refresh",
      },
    );
  }

  public markRequiredTriageUnavailable(
    message: string,
    correlationId?: string,
  ): void {
    this.intake = null;
    setTrailRuntimeAvailability(this.dependencies.runtimeStore, {
      kind: "blocked",
      message,
    });
    this.diagnostics.record("triage.required-source.unavailable", {
      correlationId,
      data: { path: TRAIL_TRIAGE_PATH },
      level: "warn",
    });
  }

  public dispose(): void {
    this.diagnostics.record("application.disposed");
    this.intake = null;
    this.dependencies.mutationQueue.dispose();
  }

  private recordClassification(
    correlationId: string,
    classification: WorkspaceClassification,
  ): void {
    this.diagnostics.record("workspace.classified", {
      correlationId,
      data: {
        blockerCount: classification.blockers.length,
        canBootstrap: classification.canBootstrap,
        canLoad: classification.canLoad,
        mode: classification.mode,
        pluginDataKind: classification.pluginData.kind,
      },
    });
  }
}
