import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "./trail-issue";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "./trail-physical-schema";
import {
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  setTrailRuntimeAvailability,
  setTrailRuntimeConfiguration,
  type TrailRuntimeStore,
} from "./trail-runtime";
import {
  addCalendarDaysInTimeZone,
  formatLocalDateTimeInTimeZone,
  parseLocalDateTimeInTimeZone,
} from "./trail-temporal";
import {
  TrailTriageIntakeService,
  type TriageCaptureReceipt,
} from "./trail-triage-intake";
import {
  TrailTriageManagementService,
  type TriageManagementReceipt,
} from "./trail-triage-management";
import type { TrailTriagePersistence } from "./trail-triage-persistence";
import {
  TrailWorkflowEntryService,
  type WorkflowEntryReceipt,
} from "./trail-workflow-entry";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import {
  classifyWorkspace,
  executeFreshWorkspaceBootstrap,
  type WorkspaceBootstrapGateway,
  type WorkspaceClassification,
} from "./trail-workspace";

export type TrailApplicationErrorCode =
  | "not-ready"
  | "triage-invalid"
  | "workflow-invalid";

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
  readonly resolveHostTimezone: () => string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly triagePersistence: TrailTriagePersistence;
  readonly workflowPersistence: TrailWorkflowPersistence;
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

interface ReadyTriageManagement {
  readonly management: TrailTriageManagementService;
  readonly timezone: string;
}

/**
 * Composition-independent Formal application layer. It owns startup/bootstrap,
 * temporal input policy, and UI-facing Triage / Workflow actions without leaking
 * Obsidian host APIs into React or Domain planners.
 */
export class TrailApplication {
  private intake: TrailTriageIntakeService | null = null;
  private management: TrailTriageManagementService | null = null;
  private workflow: TrailWorkflowEntryService | null = null;
  private timezone: string | null = null;
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
      resolveHostTimezone,
      runtimeStore,
      triagePersistence,
      workflowPersistence,
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
        this.clearServices();
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

      const configuration = classification.pluginData.data.configuration;
      const timezone = configuration.temporal.timezone;
      setTrailRuntimeConfiguration(runtimeStore, configuration);

      const intake = new TrailTriageIntakeService(
        runtimeStore,
        mutationQueue,
        triagePersistence,
        {
          createId,
          now,
          resolveDefaultDue: (effectiveAt) =>
            addCalendarDaysInTimeZone(effectiveAt, timezone, 7),
        },
        this.diagnostics,
      );
      const management = new TrailTriageManagementService(
        runtimeStore,
        mutationQueue,
        triagePersistence,
        { createId, now },
        this.diagnostics,
      );
      const workflow = new TrailWorkflowEntryService(
        runtimeStore,
        mutationQueue,
        workflowPersistence,
        configuration,
        { createId, now },
        this.diagnostics,
      );

      this.diagnostics.record("triage.initialize.started", {
        correlationId: operationId,
      });
      await intake.initialize(operationId);
      await workflow.initialize(operationId);

      this.intake = intake;
      this.management = management;
      this.workflow = workflow;
      this.timezone = timezone;
      setTrailRuntimeAvailability(runtimeStore, {
        kind: "ready",
        timezone,
      });
      this.diagnostics.record("application.ready", {
        correlationId: operationId,
        data: {
          committedRevision: runtimeStore.getState().committed.revision,
          projectCount: runtimeStore.getState().committed.projectIds.length,
          timezone,
          triageCount: runtimeStore.getState().committed.triageIssueIds.length,
          workflowIssueCount: Object.keys(
            runtimeStore.getState().committed.workflowIssuesById,
          ).length,
        },
      });
      return classification;
    } catch (error: unknown) {
      this.clearServices();
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
    this.assertTriageSourceValid(
      "application.capture.rejected",
      "Quick Capture is paused until Triage.md is valid again",
    );
    return this.intake.capture({ title });
  }

  public editTriageIssue(
    expectedIssue: TrailTriageIssue,
    title: string,
    dueLocalValue: string,
  ): TriageManagementReceipt {
    const ready = this.requireTriageManagement(expectedIssue.id, "edit");
    const currentDueLocal = formatLocalDateTimeInTimeZone(
      expectedIssue.due,
      ready.timezone,
    );
    const due = dueLocalValue === currentDueLocal
      ? expectedIssue.due
      : parseLocalDateTimeInTimeZone(dueLocalValue, ready.timezone);
    this.diagnostics.record("application.triage.edit.requested", {
      data: {
        dueChanged: due !== expectedIssue.due,
        issueId: expectedIssue.id,
        titleLength: title.length,
      },
    });
    return ready.management.edit({ due, expectedIssue, title });
  }

  public deferTriageIssue(expectedIssue: TrailTriageIssue): TriageManagementReceipt {
    const ready = this.requireTriageManagement(expectedIssue.id, "defer");
    const due = addCalendarDaysInTimeZone(
      expectedIssue.due,
      ready.timezone,
      7,
    );
    this.diagnostics.record("application.triage.defer.requested", {
      data: { issueId: expectedIssue.id },
    });
    return ready.management.defer({ due, expectedIssue });
  }

  public deleteTriageIssue(expectedIssue: TrailTriageIssue): TriageManagementReceipt {
    const ready = this.requireTriageManagement(expectedIssue.id, "delete");
    this.diagnostics.record("application.triage.delete.requested", {
      data: { issueId: expectedIssue.id },
    });
    return ready.management.delete(expectedIssue);
  }

  public createProject(title: string): WorkflowEntryReceipt {
    const workflow = this.requireWorkflow("project.create");
    this.diagnostics.record("application.workflow.project-create.requested", {
      data: { titleLength: title.length },
    });
    return workflow.createProject(title);
  }

  public createWorkflowIssue(
    projectId: string,
    title: string,
  ): WorkflowEntryReceipt {
    const workflow = this.requireWorkflow("issue.create", projectId);
    this.diagnostics.record("application.workflow.issue-create.requested", {
      data: { projectId, titleLength: title.length },
    });
    return workflow.createIssue(projectId, title);
  }

  public changeWorkflowIssueStatus(
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ): WorkflowEntryReceipt {
    const workflow = this.requireWorkflow("issue.status", expectedIssue.id);
    this.diagnostics.record("application.workflow.issue-status.requested", {
      data: {
        hasEstimateInput: estimate !== undefined,
        issueId: expectedIssue.id,
        targetStatusDefinitionId,
      },
    });
    return workflow.changeIssueStatus(
      expectedIssue,
      targetStatusDefinitionId,
      estimate,
    );
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

  public async refreshWorkflowSource(
    filePath: string,
    correlationId?: string,
  ): Promise<void> {
    if (this.workflow === null) {
      return;
    }
    await this.workflow.refreshSource(filePath, correlationId);
  }

  public async refreshWorkflow(correlationId?: string): Promise<void> {
    if (this.workflow === null) {
      return;
    }
    await this.workflow.refreshAll(correlationId);
  }

  public async removeWorkflowSource(
    filePath: string,
    correlationId?: string,
  ): Promise<void> {
    if (this.workflow === null) {
      return;
    }
    await this.workflow.removeSource(filePath, correlationId);
  }

  public markWorkflowRootUnavailable(
    message: string,
    correlationId?: string,
  ): void {
    setSourceIssuesForPath(this.dependencies.runtimeStore, TRAIL_PROJECTS_PATH, [{
      code: "workflow.projects.root-unavailable",
      filePath: TRAIL_PROJECTS_PATH,
      message,
      scope: "file",
    }]);
    this.diagnostics.record("workflow.required-root.unavailable", {
      correlationId,
      data: { path: TRAIL_PROJECTS_PATH },
      level: "warn",
    });
  }

  public markRequiredTriageUnavailable(
    message: string,
    correlationId?: string,
  ): void {
    this.intake = null;
    this.management = null;
    setSourceIssuesForPath(this.dependencies.runtimeStore, TRAIL_TRIAGE_PATH, [{
      code: "triage.required-source.unavailable",
      filePath: TRAIL_TRIAGE_PATH,
      message,
      scope: "file",
    }]);
    this.diagnostics.record("triage.required-source.unavailable", {
      correlationId,
      data: { path: TRAIL_TRIAGE_PATH },
      level: "warn",
    });
  }

  public dispose(): void {
    this.diagnostics.record("application.disposed");
    this.clearServices();
    this.dependencies.mutationQueue.dispose();
  }

  private assertTriageSourceValid(
    diagnosticEvent: string,
    message = "Triage actions are paused until Triage.md is valid again",
  ): void {
    const state = this.dependencies.runtimeStore.getState();
    const sourceIssues = selectSourceIssuesForPath(state, TRAIL_TRIAGE_PATH);
    if (sourceIssues.length === 0) {
      return;
    }
    this.diagnostics.record(diagnosticEvent, {
      data: {
        reason: "triage-invalid",
        sourceIssueCount: sourceIssues.length,
      },
      level: "warn",
    });
    throw new TrailApplicationError("triage-invalid", message);
  }

  private requireTriageManagement(
    issueId: string,
    action: "defer" | "delete" | "edit",
  ): ReadyTriageManagement {
    const state = this.dependencies.runtimeStore.getState();
    if (
      state.availability.kind !== "ready"
      || this.management === null
      || this.timezone === null
    ) {
      this.diagnostics.record(`application.triage.${action}.rejected`, {
        data: { issueId, reason: "not-ready" },
        level: "warn",
      });
      throw new TrailApplicationError(
        "not-ready",
        "Trail is not ready for Triage management",
      );
    }
    this.assertTriageSourceValid(`application.triage.${action}.rejected`);
    return { management: this.management, timezone: this.timezone };
  }

  private requireWorkflow(action: string, entityId?: string): TrailWorkflowEntryService {
    const state = this.dependencies.runtimeStore.getState();
    if (state.availability.kind === "ready" && this.workflow !== null) {
      const rootIssues = selectSourceIssuesForPath(state, TRAIL_PROJECTS_PATH);
      if (rootIssues.length === 0) {
        return this.workflow;
      }
      this.diagnostics.record(`application.workflow.${action}.rejected`, {
        data: {
          entityId: entityId ?? null,
          reason: "projects-root-invalid",
          sourceIssueCount: rootIssues.length,
        },
        level: "warn",
      });
      throw new TrailApplicationError(
        "workflow-invalid",
        "Workflow actions are paused until Trail/Projects is valid again",
      );
    }
    this.diagnostics.record(`application.workflow.${action}.rejected`, {
      data: { entityId: entityId ?? null, reason: "not-ready" },
      level: "warn",
    });
    throw new TrailApplicationError(
      "not-ready",
      "Trail is not ready for Workflow actions",
    );
  }

  private clearServices(): void {
    this.intake = null;
    this.management = null;
    this.workflow = null;
    this.timezone = null;
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
