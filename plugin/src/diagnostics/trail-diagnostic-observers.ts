import type { TrailApplicationSession } from "../application/trail-application-session";
import type {
  TrailEntityMutationReceipt,
  TrailMutationActionResult,
} from "../application/trail-application-support";
import type { TrailWorkflowIssue } from "../domain/model/trail-entities";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import type { TrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import type { TrailPluginDataIO } from "../persistence/ports/trail-plugin-data-io";
import type { TrailSourceIO } from "../persistence/ports/trail-source-io";
import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailDiagnostics, TrailDiagnosticData } from "./trail-diagnostics";

function errorData(error: unknown): TrailDiagnosticData {
  return {
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : "UnknownError",
  };
}

function observeReceipt(
  diagnostics: TrailDiagnostics,
  eventPrefix: string,
  receipt: TrailEntityMutationReceipt,
  data: TrailDiagnosticData = {},
): TrailEntityMutationReceipt {
  diagnostics.record(`${eventPrefix}.submitted`, {
    correlationId: receipt.commandId,
    data: { ...data, entityId: receipt.entityId },
  });
  void receipt.completion.then(
    () => diagnostics.record(`${eventPrefix}.completed`, {
      correlationId: receipt.commandId,
      data: { ...data, entityId: receipt.entityId },
    }),
    (error: unknown) => diagnostics.record(`${eventPrefix}.failed`, {
      correlationId: receipt.commandId,
      data: { ...data, entityId: receipt.entityId, ...errorData(error) },
      level: "error",
    }),
  );
  return receipt;
}

function observeActionResult(
  diagnostics: TrailDiagnostics,
  eventPrefix: string,
  result: TrailMutationActionResult,
  data: TrailDiagnosticData = {},
): TrailMutationActionResult {
  switch (result.kind) {
    case "submitted":
      observeReceipt(diagnostics, eventPrefix, result.receipt, data);
      break;
    case "needs-input":
      diagnostics.record(`${eventPrefix}.needs-input`, {
        data: { ...data, code: result.input.code, message: result.input.message },
      });
      break;
    case "unchanged":
      diagnostics.record(`${eventPrefix}.unchanged`, {
        data: { ...data, entityId: result.entityId },
      });
      break;
  }
  return result;
}

function recordThrown(
  diagnostics: TrailDiagnostics,
  eventPrefix: string,
  error: unknown,
  data: TrailDiagnosticData,
): never {
  diagnostics.record(`${eventPrefix}.rejected`, {
    data: { ...data, ...errorData(error) },
    level: "warn",
  });
  throw error;
}

/** Wraps only the UI-facing Application surface, preserving Domain/Application ownership. */
export function createDiagnosticTrailUiActions(
  session: TrailApplicationSession,
  diagnostics: TrailDiagnostics,
): {
  readonly initiatives: Pick<
    TrailApplicationSession["initiatives"],
    "create"
  >;
  readonly issues: Pick<
    TrailApplicationSession["issues"],
    "changeStatus" | "create" | "moveToProject"
  >;
  readonly projects: Pick<
    TrailApplicationSession["projects"],
    "changeInitiative" | "changeStatus" | "create"
  >;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "capture" | "convertToProject" | "defer" | "delete" | "edit"
  >;
} {
  if (!diagnostics.enabled) return session;
  return {
    initiatives: {
      create(title: string): TrailEntityMutationReceipt {
        const data = { titleLength: title.length };
        try {
          return observeReceipt(
            diagnostics,
            "ui.initiative.create",
            session.initiatives.create(title),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.initiative.create", error, data);
        }
      },
    },
    issues: {
      changeStatus(
        expectedIssue: TrailWorkflowIssue,
        targetStatusDefinitionId: string,
        estimate?: number,
      ): TrailMutationActionResult {
        const data = {
          estimateProvided: estimate !== undefined,
          issueId: expectedIssue.id,
          targetStatusDefinitionId,
        };
        try {
          return observeActionResult(
            diagnostics,
            "ui.workflow.issue-status",
            session.issues.changeStatus(expectedIssue, targetStatusDefinitionId, estimate),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.workflow.issue-status", error, data);
        }
      },
      create(projectId: string, title: string): TrailEntityMutationReceipt {
        const data = { projectId, titleLength: title.length };
        try {
          return observeReceipt(
            diagnostics,
            "ui.workflow.issue-create",
            session.issues.create(projectId, title),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.workflow.issue-create", error, data);
        }
      },
      moveToProject(expectedIssue, targetProjectId): TrailMutationActionResult {
        const data = {
          issueId: expectedIssue.id,
          sourceProjectId: expectedIssue.projectId ?? null,
          targetProjectId: targetProjectId ?? null,
        };
        try {
          return observeActionResult(
            diagnostics,
            "ui.workflow.issue-project",
            session.issues.moveToProject(expectedIssue, targetProjectId),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.workflow.issue-project", error, data);
        }
      },
    },
    projects: {
      changeInitiative(expectedProject, targetInitiativeId): TrailMutationActionResult {
        const data = {
          projectId: expectedProject.id,
          sourceInitiativeId: expectedProject.initiativeId ?? null,
          targetInitiativeId: targetInitiativeId ?? null,
        };
        try {
          return observeActionResult(
            diagnostics,
            "ui.project.initiative",
            session.projects.changeInitiative(expectedProject, targetInitiativeId),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.project.initiative", error, data);
        }
      },
      changeStatus(expectedProject, targetStatusDefinitionId): TrailMutationActionResult {
        const data = {
          projectId: expectedProject.id,
          targetStatusDefinitionId,
        };
        try {
          return observeActionResult(
            diagnostics,
            "ui.project.status",
            session.projects.changeStatus(expectedProject, targetStatusDefinitionId),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.project.status", error, data);
        }
      },
      create(title: string): TrailEntityMutationReceipt {
        const data = { titleLength: title.length };
        try {
          return observeReceipt(
            diagnostics,
            "ui.project.create",
            session.projects.create(title),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.project.create", error, data);
        }
      },
    },
    triage: {
      accept(expectedIssue, projectId): TrailEntityMutationReceipt {
        const data = { projectId, sourceIssueId: expectedIssue.id };
        try {
          return observeReceipt(
            diagnostics,
            "ui.triage.accept",
            session.triage.accept(expectedIssue, projectId),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.accept", error, data);
        }
      },
      capture(title: string): TrailEntityMutationReceipt {
        const data = { titleLength: title.length };
        try {
          return observeReceipt(
            diagnostics,
            "ui.triage.capture",
            session.triage.capture(title),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.capture", error, data);
        }
      },
      convertToProject(expectedIssue): TrailEntityMutationReceipt {
        const data = { sourceIssueId: expectedIssue.id };
        try {
          return observeReceipt(
            diagnostics,
            "ui.triage.convert-project",
            session.triage.convertToProject(expectedIssue),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.convert-project", error, data);
        }
      },
      defer(expectedIssue, due): TrailEntityMutationReceipt {
        const data = { due, issueId: expectedIssue.id };
        try {
          return observeReceipt(
            diagnostics,
            "ui.triage.defer",
            session.triage.defer(expectedIssue, due),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.defer", error, data);
        }
      },
      delete(expectedIssue): TrailEntityMutationReceipt {
        const data = { issueId: expectedIssue.id };
        try {
          return observeReceipt(
            diagnostics,
            "ui.triage.delete",
            session.triage.delete(expectedIssue),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.delete", error, data);
        }
      },
      edit(expectedIssue, input): TrailMutationActionResult {
        const data = {
          due: input.due,
          issueId: expectedIssue.id,
          titleLength: input.title.length,
        };
        try {
          return observeActionResult(
            diagnostics,
            "ui.triage.edit",
            session.triage.edit(expectedIssue, input),
            data,
          );
        } catch (error: unknown) {
          return recordThrown(diagnostics, "ui.triage.edit", error, data);
        }
      },
    },
  };
}

function mutationEffectKinds(plan: TrailMutationPlan): readonly string[] {
  return plan.effects.map(({ kind }) => kind);
}

/** Observes the generic logical mutation boundary using the canonical command ID as correlation. */
export function createDiagnosticTrailSourceSync(
  sourceSync: TrailAuthoritativeSourceSync,
  diagnostics: TrailDiagnostics,
): TrailAuthoritativeSourceSync {
  if (!diagnostics.enabled) return sourceSync;
  return {
    submit(plan) {
      diagnostics.record("mutation.submitted", {
        correlationId: plan.commandId,
        data: {
          affectedEntityIds: plan.affectedScope.entityIds,
          effectKinds: mutationEffectKinds(plan),
          intent: plan.intent,
        },
      });
      return sourceSync.submit(plan).then(
        (result) => {
          diagnostics.record("mutation.committed", {
            correlationId: plan.commandId,
            data: { intent: plan.intent },
          });
          return result;
        },
        (error: unknown) => {
          diagnostics.record("mutation.failed", {
            correlationId: plan.commandId,
            data: { intent: plan.intent, ...errorData(error) },
            level: "error",
          });
          throw error;
        },
      );
    },
  };
}

async function traceWrite<TResult>(
  diagnostics: TrailDiagnostics,
  eventPrefix: string,
  data: TrailDiagnosticData,
  operation: () => Promise<TResult>,
): Promise<TResult> {
  const correlationId = diagnostics.createCorrelationId(eventPrefix);
  diagnostics.record(`${eventPrefix}.started`, { correlationId, data });
  try {
    const result = await operation();
    diagnostics.record(`${eventPrefix}.completed`, { correlationId, data });
    return result;
  } catch (error: unknown) {
    diagnostics.record(`${eventPrefix}.failed`, {
      correlationId,
      data: { ...data, ...errorData(error) },
      level: "error",
    });
    throw error;
  }
}

/** Adds write-path observability without changing SourceIO semantics. */
export function createDiagnosticTrailSourceIO(
  sourceIO: TrailSourceIO,
  diagnostics: TrailDiagnostics,
): TrailSourceIO {
  if (!diagnostics.enabled) return sourceIO;
  return {
    create: (path, content) => traceWrite(
      diagnostics,
      "persistence.source.create",
      { contentLength: content.length, path },
      () => sourceIO.create(path, content),
    ),
    delete: (path) => traceWrite(
      diagnostics,
      "persistence.source.delete",
      { path },
      () => sourceIO.delete(path),
    ),
    list: (path) => sourceIO.list(path).catch((error: unknown) => {
      diagnostics.record("persistence.source.list.failed", {
        data: { path, ...errorData(error) },
        level: "error",
      });
      throw error;
    }),
    process: (path, transform) => traceWrite(
      diagnostics,
      "persistence.source.process",
      { path },
      () => sourceIO.process(path, transform),
    ),
    read: (path) => sourceIO.read(path).catch((error: unknown) => {
      diagnostics.record("persistence.source.read.failed", {
        data: { path, ...errorData(error) },
        level: "error",
      });
      throw error;
    }),
    rename: (from, to) => traceWrite(
      diagnostics,
      "persistence.source.rename",
      { from, to },
      () => sourceIO.rename(from, to),
    ),
  };
}

/** Adds plugin-data write/error evidence while keeping the raw host carrier unchanged. */
export function createDiagnosticTrailPluginDataIO(
  pluginDataIO: TrailPluginDataIO,
  diagnostics: TrailDiagnostics,
): TrailPluginDataIO {
  if (!diagnostics.enabled) return pluginDataIO;
  return {
    load: () => pluginDataIO.load().catch((error: unknown) => {
      diagnostics.record("persistence.plugin-data.load.failed", {
        data: errorData(error),
        level: "error",
      });
      throw error;
    }),
    save: (data) => traceWrite(
      diagnostics,
      "persistence.plugin-data.save",
      { hasValue: data !== null && data !== undefined },
      () => pluginDataIO.save(data),
    ),
  };
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function issueCount(sourceIssuesByPath: Readonly<Record<string, readonly unknown[]>>): number {
  return Object.values(sourceIssuesByPath).reduce((total, issues) => total + issues.length, 0);
}

/** Records only meaningful Runtime transitions, not every Zustand notification. */
export function observeTrailRuntimeDiagnostics(
  runtimeStore: TrailRuntimeStore,
  diagnostics: TrailDiagnostics,
): () => void {
  if (!diagnostics.enabled) return () => undefined;

  const initial = runtimeStore.getState();
  diagnostics.record("runtime.observer.started", {
    data: {
      control: initial.control.kind,
      revision: initial.committed.revision,
    },
  });

  return runtimeStore.subscribe((state, previous) => {
    if (
      state.control.kind !== previous.control.kind
      || (state.control.kind === "read-only-error"
        && previous.control.kind === "read-only-error"
        && state.control.message !== previous.control.message)
    ) {
      diagnostics.record("runtime.control.changed", {
        data: {
          from: previous.control.kind,
          message: state.control.kind === "read-only-error" ? state.control.message : null,
          to: state.control.kind,
        },
      });
    }

    if (state.committed.revision !== previous.committed.revision) {
      diagnostics.record("runtime.committed.published", {
        data: {
          cycles: state.committed.authoritative.domain.cyclesById.size,
          initiatives: state.committed.authoritative.domain.initiativesById.size,
          issues: state.committed.authoritative.domain.issuesById.size,
          milestones: state.committed.authoritative.domain.milestonesById.size,
          projects: state.committed.authoritative.domain.projectsById.size,
          revision: state.committed.revision,
        },
      });
    }

    const pending = state.pending.map(({ commandId }) => commandId);
    const previousPending = previous.pending.map(({ commandId }) => commandId);
    if (!sameStrings(pending, previousPending)) {
      diagnostics.record("runtime.pending.changed", {
        data: { commandIds: pending },
      });
    }

    const sourcePaths = Object.keys(state.health.sourceIssuesByPath).sort();
    const previousSourcePaths = Object.keys(previous.health.sourceIssuesByPath).sort();
    const count = issueCount(state.health.sourceIssuesByPath);
    const previousCount = issueCount(previous.health.sourceIssuesByPath);
    if (count !== previousCount || !sameStrings(sourcePaths, previousSourcePaths)) {
      diagnostics.record("runtime.health.changed", {
        data: { issueCount: count, sourcePaths },
        level: count > 0 ? "warn" : "info",
      });
    }
  });
}
