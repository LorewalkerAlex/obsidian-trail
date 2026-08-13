import { TrailMutationQueue } from "./trail-mutation-queue";
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

/**
 * Composition-independent Formal application layer. It owns startup/bootstrap,
 * creates the Triage Intake service only after Configuration is trustworthy, and
 * exposes UI-facing capture/refresh actions without leaking Obsidian host APIs.
 */
export class TrailApplication {
  private intake: TrailTriageIntakeService | null = null;

  public constructor(
    private readonly dependencies: TrailApplicationDependencies,
  ) {}

  public async initialize(): Promise<WorkspaceClassification> {
    const {
      createId,
      mutationQueue,
      now,
      persistence,
      resolveHostTimezone,
      runtimeStore,
      workspace,
    } = this.dependencies;

    setTrailRuntimeAvailability(runtimeStore, { kind: "initializing" });

    try {
      let classification = classifyWorkspace(await workspace.probeWorkspace());

      if (classification.canBootstrap) {
        await executeFreshWorkspaceBootstrap(workspace, {
          createId,
          timezone: resolveHostTimezone(),
        });
        classification = classifyWorkspace(await workspace.probeWorkspace());
      }

      if (!classification.canLoad || classification.pluginData.kind !== "valid") {
        this.intake = null;
        setTrailRuntimeAvailability(runtimeStore, {
          kind: "blocked",
          message: `Trail cannot load the Formal workspace: ${blockerMessage(classification)}`,
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
      );

      await intake.initialize();
      this.intake = intake;
      setTrailRuntimeAvailability(runtimeStore, {
        kind: "ready",
        timezone,
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
      throw error;
    }
  }

  public capture(title: string): TriageCaptureReceipt {
    const state = this.dependencies.runtimeStore.getState();
    if (state.availability.kind !== "ready" || this.intake === null) {
      throw new TrailApplicationError(
        "not-ready",
        "Trail is not ready for Quick Capture",
      );
    }
    if (state.committed.sourceIssues.length > 0) {
      throw new TrailApplicationError(
        "triage-invalid",
        "Quick Capture is paused until Triage.md is valid again",
      );
    }

    return this.intake.capture({ title });
  }

  public async refreshTriage(): Promise<boolean> {
    if (this.intake === null) {
      return false;
    }

    return this.dependencies.mutationQueue.enqueue(() =>
      this.intake?.refreshFromPersistence() ?? Promise.resolve(false));
  }

  public markRequiredTriageUnavailable(message: string): void {
    this.intake = null;
    setTrailRuntimeAvailability(this.dependencies.runtimeStore, {
      kind: "blocked",
      message,
    });
  }

  public dispose(): void {
    this.intake = null;
    this.dependencies.mutationQueue.dispose();
  }
}
