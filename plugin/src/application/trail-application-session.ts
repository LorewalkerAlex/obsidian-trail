import type { TrailDiagnostics } from "../diagnostics/trail-diagnostics";
import type { TrailConfiguration } from "../domain/trail-configuration";
import { TrailMutationQueue } from "../mutation/queue/trail-mutation-queue";
import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailProjectSourceSync } from "../source-sync/projects/trail-project-source-sync";
import type { TrailTriageSourceSync } from "../source-sync/triage/trail-triage-source-sync";
import { TrailWorkflowIssueApplication } from "./issues/trail-workflow-issue-application";
import { TrailProjectApplication } from "./projects/trail-project-application";
import { TrailTriageAcceptService } from "./triage/trail-triage-accept";
import { TrailTriageIntakeService } from "./triage/trail-triage-intake";
import { TrailTriageManagementService } from "./triage/trail-triage-management";
import { addCalendarDaysInTimeZone } from "../domain/trail-temporal";

export interface TrailApplicationSession {
  readonly accept: Pick<TrailTriageAcceptService, "accept">;
  readonly intake: Pick<TrailTriageIntakeService, "capture">;
  readonly issues: Pick<TrailWorkflowIssueApplication, "changeStatus" | "create">;
  readonly management: Pick<TrailTriageManagementService, "defer" | "delete" | "edit">;
  readonly projects: Pick<TrailProjectApplication, "create">;
  readonly timezone: string;
}

export interface TrailApplicationSessionSource {
  readonly current: () => TrailApplicationSession | null;
}

export interface TrailApplicationSessionRegistry extends TrailApplicationSessionSource {
  readonly clear: () => void;
  readonly replace: (session: TrailApplicationSession) => void;
}

/** Holds the currently valid UI-facing use-case graph without owning persistence. */
export function createTrailApplicationSessionRegistry(): TrailApplicationSessionRegistry {
  let current: TrailApplicationSession | null = null;
  return {
    clear(): void {
      current = null;
    },
    current: () => current,
    replace(session): void {
      current = session;
    },
  };
}

/**
 * Builds the feature-service graph for one validated Runtime configuration.
 * Raw persistence and host APIs remain outside the Application layer.
 */
export function createTrailApplicationSession(options: {
  readonly configuration: TrailConfiguration;
  readonly createId: () => string;
  readonly diagnostics: TrailDiagnostics;
  readonly mutationQueue: TrailMutationQueue;
  readonly now: () => number;
  readonly runtimeStore: TrailRuntimeStore;
  readonly triageSources: TrailTriageSourceSync;
  readonly workflowSources: TrailProjectSourceSync;
}): TrailApplicationSession {
  const timezone = options.configuration.temporal.timezone;
  const commandEnvironment = {
    createId: options.createId,
    now: options.now,
  };
  const intake = new TrailTriageIntakeService(
    options.runtimeStore,
    options.triageSources,
    {
      ...commandEnvironment,
      resolveDefaultDue: (effectiveAt) =>
        addCalendarDaysInTimeZone(effectiveAt, timezone, 7),
    },
    options.diagnostics,
  );
  const management = new TrailTriageManagementService(
    options.runtimeStore,
    options.triageSources,
    commandEnvironment,
    options.diagnostics,
  );
  const projects = new TrailProjectApplication(
    options.runtimeStore,
    options.workflowSources,
    options.configuration,
    commandEnvironment,
    options.diagnostics,
  );
  const issues = new TrailWorkflowIssueApplication(
    options.runtimeStore,
    options.workflowSources,
    options.configuration,
    commandEnvironment,
    options.diagnostics,
  );
  const accept = new TrailTriageAcceptService(
    options.runtimeStore,
    options.mutationQueue,
    options.triageSources,
    options.workflowSources,
    options.configuration,
    commandEnvironment,
    options.diagnostics,
  );

  return {
    accept,
    intake,
    issues,
    management,
    projects,
    timezone,
  };
}