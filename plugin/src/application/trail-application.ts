import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../domain/trail-issue";
import {
  addCalendarDaysInTimeZone,
  formatLocalDateTimeInTimeZone,
  parseLocalDateTimeInTimeZone,
} from "../domain/trail-temporal";
import {
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../markdown/schema/trail-paths";
import {
  selectSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../runtime/store/trail-runtime-store";
import type {
  TrailApplicationActions,
  TrailEntityMutationReceipt,
} from "./trail-application-contracts";
import type {
  TrailApplicationSession,
  TrailApplicationSessionSource,
} from "./trail-application-session";
import type { TriageAcceptReceipt } from "./triage/trail-triage-accept";
import type { TriageCaptureReceipt } from "./triage/trail-triage-intake";
import type { TriageManagementReceipt } from "./triage/trail-triage-management";

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
  readonly diagnostics?: TrailDiagnostics;
  readonly runtimeStore: TrailRuntimeStore;
  readonly session: TrailApplicationSessionSource;
}

interface ReadyTriageManagement {
  readonly management: TrailApplicationSession["management"];
  readonly timezone: string;
}

/**
 * UI-facing Application facade. It owns use-case gating and temporal input
 * mapping, while startup, source refresh, persistence, and dependency composition
 * stay outside the Application boundary.
 */
export class TrailApplication implements TrailApplicationActions {
  private readonly diagnostics: TrailDiagnostics;

  public constructor(
    private readonly dependencies: TrailApplicationDependencies,
  ) {
    this.diagnostics = dependencies.diagnostics ?? NOOP_TRAIL_DIAGNOSTICS;
  }

  public capture(title: string): TriageCaptureReceipt {
    const state = this.dependencies.runtimeStore.getState();
    const session = this.dependencies.session.current();
    this.diagnostics.record("application.capture.requested", {
      data: {
        control: state.control.kind,
        titleLength: title.length,
      },
    });

    if (state.control.kind !== "ready" || session === null) {
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
    return session.intake.capture({ title });
  }

  public acceptTriageIssue(
    expectedIssue: TrailTriageIssue,
    projectId: string,
  ): TriageAcceptReceipt {
    const session = this.requireReadySession(
      "application.triage.accept.rejected",
      "Trail is not ready for Triage Accept",
      {
        projectId,
        sourceIssueId: expectedIssue.id,
      },
    );
    this.assertTriageSourceValid("application.triage.accept.rejected");

    const state = this.dependencies.runtimeStore.getState();
    const rootIssues = selectSourceIssuesForPath(state, TRAIL_PROJECTS_PATH);
    const targetPath = state.committed.ownership.sourceByEntityId[projectId];
    const targetIssues = selectSourceIssuesForPath(state, targetPath);
    if (rootIssues.length > 0 || targetIssues.length > 0) {
      this.diagnostics.record("application.triage.accept.rejected", {
        data: {
          projectId,
          reason: "workflow-invalid",
          sourceIssueCount: rootIssues.length + targetIssues.length,
          sourceIssueId: expectedIssue.id,
        },
        level: "warn",
      });
      throw new TrailApplicationError(
        "workflow-invalid",
        "Triage Accept is paused until the target Workflow source is valid again",
      );
    }

    this.diagnostics.record("application.triage.accept.requested", {
      data: {
        projectId,
        sourceIssueId: expectedIssue.id,
      },
    });
    return session.accept.accept(expectedIssue, projectId);
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

  public createProject(title: string): TrailEntityMutationReceipt {
    const session = this.requireWorkflowSession("project.create");
    this.diagnostics.record("application.workflow.project-create.requested", {
      data: { titleLength: title.length },
    });
    return session.projects.create(title);
  }

  public createWorkflowIssue(
    projectId: string,
    title: string,
  ): TrailEntityMutationReceipt {
    const session = this.requireWorkflowSession("issue.create", projectId);
    this.diagnostics.record("application.workflow.issue-create.requested", {
      data: { projectId, titleLength: title.length },
    });
    return session.issues.create(projectId, title);
  }

  public changeWorkflowIssueStatus(
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ): TrailEntityMutationReceipt {
    const session = this.requireWorkflowSession("issue.status", expectedIssue.id);
    this.diagnostics.record("application.workflow.issue-status.requested", {
      data: {
        hasEstimateInput: estimate !== undefined,
        issueId: expectedIssue.id,
        targetStatusDefinitionId,
      },
    });
    return session.issues.changeStatus(
      expectedIssue,
      targetStatusDefinitionId,
      estimate,
    );
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

  private requireReadySession(
    diagnosticEvent: string,
    message: string,
    data: Readonly<Record<string, unknown>>,
  ): TrailApplicationSession {
    const state = this.dependencies.runtimeStore.getState();
    const session = this.dependencies.session.current();
    if (state.control.kind === "ready" && session !== null) {
      return session;
    }
    this.diagnostics.record(diagnosticEvent, {
      data: { ...data, reason: "not-ready" },
      level: "warn",
    });
    throw new TrailApplicationError("not-ready", message);
  }

  private requireTriageManagement(
    issueId: string,
    action: "defer" | "delete" | "edit",
  ): ReadyTriageManagement {
    const session = this.requireReadySession(
      `application.triage.${action}.rejected`,
      "Trail is not ready for Triage management",
      { issueId },
    );
    this.assertTriageSourceValid(`application.triage.${action}.rejected`);
    return { management: session.management, timezone: session.timezone };
  }

  private requireWorkflowSession(
    action: string,
    entityId?: string,
  ): TrailApplicationSession {
    const session = this.requireReadySession(
      `application.workflow.${action}.rejected`,
      "Trail is not ready for Workflow actions",
      { entityId: entityId ?? null },
    );
    const state = this.dependencies.runtimeStore.getState();
    const rootIssues = selectSourceIssuesForPath(state, TRAIL_PROJECTS_PATH);
    if (rootIssues.length === 0) {
      return session;
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
      "Workflow actions are paused until the Projects source is valid again",
    );
  }
}