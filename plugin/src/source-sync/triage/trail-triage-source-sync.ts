import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import { submitTrailMutation } from "../../mutation/coordinator/trail-mutation-coordinator";
import { executeTrailSingleTransaction } from "../../mutation/execution/trail-single-transaction-executor";
import { materializeTrailSingleTransactionPlan } from "../../mutation/physical/trail-single-transaction-plan";
import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailTriageSourceSnapshot } from "../../persistence/domain-sources/trail-domain-source-snapshot";
import type { TrailTriageSourceResult } from "../../persistence/domain-sources/trail-source-result";
import {
  TrailTriagePersistenceError,
  type TrailTriagePersistence,
} from "../../persistence/domain-sources/trail-triage-persistence";
import { reconcileTriageContribution } from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";

export type TrailTriageSourceActionKind =
  | "triage.capture"
  | "triage.defer"
  | "triage.delete"
  | "triage.edit";

export type TrailTriageSourceMutationErrorCode =
  | "conflict"
  | "persistence-failed"
  | "source-invalid"
  | "verification-failed";

export class TrailTriageSourceMutationError extends Error {
  public constructor(
    readonly code: TrailTriageSourceMutationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailTriageSourceMutationError";
  }
}

export interface TrailTriageSourceMutationRequest {
  readonly actionKind: TrailTriageSourceActionKind;
  readonly correlationId: string;
  readonly entityId: string;
  readonly expectedIssue?: TrailTriageIssue;
  readonly plan: TrailMutationPlan;
}

function errorCategory(error: unknown): string {
  if (error instanceof TrailTriageSourceMutationError) return error.code;
  if (error instanceof TrailTriagePersistenceError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown-error";
}

function issueCodes(result: TrailTriageSourceResult): readonly string[] {
  return result.issues.map((issue) => issue.code);
}

function invalidSourceMessage(result: TrailTriageSourceResult): string {
  return result.issues.map((issue) => issue.message).join("; ");
}

/** Owns authoritative Triage-source reads, writes, source health, and Runtime reconciliation. */
export class TrailTriageSourceSync {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailTriagePersistence,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public async initialize(correlationId?: string): Promise<void> {
    this.diagnostics.record("triage.persistence.read.started", {
      correlationId,
      data: { reason: "initialize" },
    });
    const latest = await this.persistence.readLatest();
    this.recordReadCompleted(latest, "initialize", correlationId);
    if (!this.consumeReadResult(latest, "initialize", correlationId, "error")) {
      throw new TrailTriageSourceMutationError(
        "source-invalid",
        `Triage source is invalid: ${invalidSourceMessage(latest)}`,
      );
    }
  }

  public async refresh(correlationId?: string): Promise<boolean> {
    return this.mutationQueue.enqueue(async () => {
      this.diagnostics.record("triage.persistence.read.started", {
        correlationId,
        data: { reason: "external-refresh" },
      });
      const latest = await this.persistence.readLatest();
      this.recordReadCompleted(latest, "external-refresh", correlationId);
      return this.consumeReadResult(
        latest,
        "external-refresh",
        correlationId,
        "warn",
      );
    }, { correlationId, kind: "triage.refresh" });
  }

  public submit(request: TrailTriageSourceMutationRequest) {
    const { actionKind, correlationId, entityId, expectedIssue, plan } = request;
    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: async () => {
          const physicalPlan = await materializeTrailSingleTransactionPlan(
            plan,
            this.runtimeStore.getState().committed,
          );
          if (physicalPlan.sourcePath !== TRAIL_TRIAGE_PATH) {
            throw new TrailTriageSourceMutationError(
              "verification-failed",
              "Triage mutation materialized outside the canonical Triage source",
            );
          }
          if (
            selectSourceIssuesForPath(
              this.runtimeStore.getState(),
              TRAIL_TRIAGE_PATH,
            ).length > 0
          ) {
            throw new TrailTriageSourceMutationError(
              "source-invalid",
              "Triage source is invalid; review Triage.md before retrying",
            );
          }

          this.diagnostics.record("mutation.physical.planned", {
            correlationId,
            data: {
              intent: physicalPlan.intent,
              operation: physicalPlan.operation.kind,
              sourcePath: physicalPlan.sourcePath,
              topology: "single",
            },
          });
          this.diagnostics.record("triage.persistence.write.started", {
            correlationId,
            data: {
              issueId: entityId,
              kind: actionKind,
              path: physicalPlan.sourcePath,
            },
          });

          const executed = await executeTrailSingleTransaction(
            physicalPlan,
            {
              triageCreate: this.persistence,
              triageManage: this.persistence,
            },
            correlationId,
          );
          if (executed.kind !== "triage-source") {
            throw new TrailTriageSourceMutationError(
              "verification-failed",
              "Triage mutation returned the wrong source kind",
            );
          }
          this.diagnostics.record("triage.persistence.write.completed", {
            correlationId,
            data: {
              issueCount: Object.keys(executed.result.contribution.issuesById).length,
              kind: actionKind,
              sourceIssueCount: executed.result.issues.length,
            },
          });
          return executed.result;
        },
        mapError: (error) => this.mapMutationError(error),
        onCommitted: () => {
          this.diagnostics.record("command.committed", {
            correlationId,
            data: { entityId, kind: actionKind },
          });
        },
        onFailed: (error) => {
          this.diagnostics.record("command.failed", {
            correlationId,
            data: {
              category: errorCategory(error),
              entityId,
              kind: actionKind,
            },
            level: "error",
          });
        },
        optimisticData: { entityId },
        plan,
        queueKind: actionKind,
        recover: async () => {
          await this.reconcileAfterFailure(correlationId);
        },
        settle: (persisted) => {
          const contribution = this.verifyPersistedResult(
            entityId,
            expectedIssue,
            persisted,
            correlationId,
            actionKind,
          );
          this.reconcileContribution(contribution, actionKind, correlationId);
        },
      },
      this.diagnostics,
    );
    return { completion, entityId };
  }

  private verifyPersistedResult(
    entityId: string,
    expectedIssue: TrailTriageIssue | undefined,
    persisted: TrailTriageSourceResult,
    correlationId: string,
    kind: TrailTriageSourceActionKind,
  ): TrailTriageSourceSnapshot {
    if (persisted.issues.length > 0) {
      setSourceIssuesForPath(this.runtimeStore, TRAIL_TRIAGE_PATH, persisted.issues);
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueCodes: issueCodes(persisted),
          kind,
          reason: "post-write",
        },
        level: "error",
      });
      throw new TrailTriageSourceMutationError(
        "verification-failed",
        `Persisted Triage source is invalid: ${invalidSourceMessage(persisted)}`,
      );
    }
    if (persisted.contribution.filePath !== TRAIL_TRIAGE_PATH) {
      throw new TrailTriageSourceMutationError(
        "verification-failed",
        "Persisted Triage result used a non-canonical source path",
      );
    }

    const persistedIssue = persisted.contribution.issuesById[entityId];
    const valid = expectedIssue === undefined
      ? persistedIssue === undefined
      : persistedIssue !== undefined && sameTrailTriageIssue(persistedIssue, expectedIssue);
    if (!valid) {
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueId: entityId,
          kind,
          reason: "post-write-result-mismatch",
        },
        level: "error",
      });
      throw new TrailTriageSourceMutationError(
        "verification-failed",
        "Persisted Triage mutation did not match the planned result",
      );
    }

    this.diagnostics.record("triage.validation.completed", {
      correlationId,
      data: {
        issueId: entityId,
        kind,
        reason: "post-write",
      },
    });
    return persisted.contribution;
  }

  private consumeReadResult(
    result: TrailTriageSourceResult,
    reason: string,
    correlationId: string | undefined,
    invalidLevel: "error" | "warn",
  ): boolean {
    if (result.issues.length > 0) {
      setSourceIssuesForPath(this.runtimeStore, TRAIL_TRIAGE_PATH, result.issues);
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: { issueCodes: issueCodes(result), reason },
        level: invalidLevel,
      });
      return false;
    }
    if (result.contribution.filePath !== TRAIL_TRIAGE_PATH) {
      throw new TrailTriageSourceMutationError(
        "verification-failed",
        "Triage persistence returned a non-canonical source path",
      );
    }
    this.reconcileContribution(result.contribution, reason, correlationId);
    return true;
  }

  private recordReadCompleted(
    result: TrailTriageSourceResult,
    reason: string,
    correlationId?: string,
  ): void {
    this.diagnostics.record("triage.persistence.read.completed", {
      correlationId,
      data: {
        reason,
        recordCount: Object.keys(result.contribution.issuesById).length,
        sourceIssueCount: result.issues.length,
      },
    });
  }

  private reconcileContribution(
    contribution: TrailTriageSourceSnapshot,
    reason: string,
    correlationId?: string,
  ): void {
    const result = reconcileTriageContribution(this.runtimeStore, contribution);
    this.diagnostics.record("runtime.triage.reconciled", {
      correlationId,
      data: {
        addedIds: result.diff.addedIds,
        changedFieldsById: result.diff.changedFieldsById,
        changedIds: result.diff.changedIds,
        committedRevision: result.revision,
        reason,
        removedIds: result.diff.removedIds,
        triageCount: result.triageCount,
      },
    });
  }

  private async reconcileAfterFailure(correlationId: string): Promise<void> {
    this.diagnostics.record("triage.failure-reconcile.started", { correlationId });
    try {
      const latest = await this.persistence.readLatest();
      this.recordReadCompleted(latest, "failure-reconcile", correlationId);
      if (!this.consumeReadResult(
        latest,
        "failure-reconcile",
        correlationId,
        "warn",
      )) {
        this.diagnostics.record("triage.failure-reconcile.invalid", {
          correlationId,
          data: { issueCodes: issueCodes(latest) },
          level: "warn",
        });
        return;
      }
      this.diagnostics.record("triage.failure-reconcile.completed", {
        correlationId,
        data: {
          committedRevision: this.runtimeStore.getState().committed.revision,
        },
      });
    } catch (error: unknown) {
      this.diagnostics.record("triage.failure-reconcile.failed", {
        correlationId,
        data: { category: errorCategory(error) },
        level: "error",
      });
    }
  }

  private mapMutationError(error: unknown): TrailTriageSourceMutationError {
    if (error instanceof TrailTriageSourceMutationError) return error;
    if (error instanceof TrailTriagePersistenceError) {
      if (
        error.code === "conflict"
        || error.code === "target-missing"
        || error.code === "duplicate-id"
      ) {
        return new TrailTriageSourceMutationError(
          "conflict",
          "Triage source changed outside Trail. Review the latest state and try again.",
          error,
        );
      }
      if (error.code === "source-invalid") {
        return new TrailTriageSourceMutationError(
          "source-invalid",
          "Triage source became invalid before the mutation could be saved",
          error,
        );
      }
      return new TrailTriageSourceMutationError(
        "verification-failed",
        "Triage persistence failed verification",
        error,
      );
    }
    return new TrailTriageSourceMutationError(
      "persistence-failed",
      "Triage change could not be persisted",
      error,
    );
  }
}
