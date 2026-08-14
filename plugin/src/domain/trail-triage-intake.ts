import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import { submitTrailMutation } from "../mutation/coordinator/trail-mutation-coordinator";
import {
  executeTrailSingleTransaction,
} from "../mutation/execution/trail-single-transaction-executor";
import {
  materializeTrailSingleTransactionPlan,
} from "../mutation/physical/trail-single-transaction-plan";
import { TrailMutationQueue } from "./trail-mutation-queue";
import type { TrailTriageIssue } from "./trail-issue";
import {
  reconcileTriageContribution,
  selectEffectiveIssueIdSet,
  setTriageSourceIssues,
  type TrailRuntimeStore,
} from "./trail-runtime";
import {
  normalizeQuickCaptureCommand,
  planCreateTriageIssue,
  type QuickCaptureCommandEnvironment,
  type QuickCaptureInput,
} from "./trail-triage-command";
import type {
  TrailTriageContribution,
  TrailTriageParseIssue,
} from "./trail-triage-markdown";
import type { TrailTriagePersistenceGateway } from "./trail-triage-persistence";
import { toTrailMutationPlan } from "./trail-triage-plan";

export type { TrailTriagePersistenceGateway } from "./trail-triage-persistence";

export interface TriageCaptureReceipt {
  readonly completion: Promise<void>;
  readonly issue: TrailTriageIssue;
}

export type TriageIntakeErrorCode =
  | "initialization-invalid"
  | "planning-rejected"
  | "persistence-failed"
  | "verification-failed";

export class TriageIntakeError extends Error {
  public constructor(
    readonly code: TriageIntakeErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TriageIntakeError";
  }
}

function invalidSourceMessage(issues: readonly TrailTriageParseIssue[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

function errorCategory(error: unknown): string {
  if (error instanceof TriageIntakeError) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.name;
  }
  return "unknown-error";
}

function issueCodes(
  issues: readonly TrailTriageParseIssue[],
): readonly string[] {
  return issues.map((issue) => issue.code);
}

/**
 * Application service for the first Formal vertical path. Command planning stays
 * feature-specific while optimistic projection and persistence materialization
 * consume the canonical logical mutation plan.
 */
export class TrailTriageIntakeService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailTriagePersistenceGateway,
    private readonly commandEnvironment: QuickCaptureCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public async initialize(correlationId?: string): Promise<void> {
    this.diagnostics.record("triage.persistence.read.started", {
      correlationId,
      data: { reason: "initialize" },
    });
    const latest = await this.persistence.readLatest();
    this.diagnostics.record("triage.persistence.read.completed", {
      correlationId,
      data: {
        parseIssueCount: latest.issues.length,
        reason: "initialize",
        recordCount: Object.keys(latest.contribution.issuesById).length,
      },
    });
    if (latest.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, latest.issues);
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueCodes: issueCodes(latest.issues),
          reason: "initialize",
        },
        level: "error",
      });
      throw new TriageIntakeError(
        "initialization-invalid",
        `Triage source is invalid: ${invalidSourceMessage(latest.issues)}`,
      );
    }

    this.reconcileContribution(latest.contribution, "initialize", correlationId);
  }

  /**
   * Publishes the pending logical plan synchronously. Physical placement is
   * materialized only after the global queue dequeues this command.
   */
  public capture(input: QuickCaptureInput): TriageCaptureReceipt {
    const command = normalizeQuickCaptureCommand(
      input,
      this.commandEnvironment,
    );
    const correlationId = command.commandId;
    this.diagnostics.record("command.created", {
      correlationId,
      data: {
        due: command.resolvedDue,
        effectiveAt: command.effectiveAt,
        issueId: command.issueId,
        kind: "triage.capture",
        titleLength: command.title.length,
      },
    });

    const planningIds = selectEffectiveIssueIdSet(
      this.runtimeStore.getState(),
    );
    const result = planCreateTriageIssue(planningIds, command);

    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: {
          kind: "triage.capture",
          reason: "planning-rejected",
        },
        level: "warn",
      });
      throw new TriageIntakeError(
        "planning-rejected",
        result.reason,
      );
    }

    const { plan } = result;
    const logicalPlan = toTrailMutationPlan(plan);
    this.diagnostics.record("command.planned", {
      correlationId,
      data: {
        issueId: plan.issue.id,
        kind: plan.kind,
      },
    });
    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: async () => {
          const physicalPlan = await materializeTrailSingleTransactionPlan(
            logicalPlan,
            this.runtimeStore.getState().committed,
          );
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
              issueId: plan.issue.id,
              path: physicalPlan.sourcePath,
            },
          });
          const executed = await executeTrailSingleTransaction(
            physicalPlan,
            { triageCreate: this.persistence },
            correlationId,
          );
          if (executed.kind !== "triage-source") {
            throw new TriageIntakeError(
              "verification-failed",
              "Quick Capture physical execution returned the wrong source kind",
            );
          }
          this.diagnostics.record("triage.persistence.write.completed", {
            correlationId,
            data: {
              parseIssueCount: executed.result.issues.length,
              recordCount: Object.keys(executed.result.contribution.issuesById).length,
            },
          });
          return executed.result;
        },
        mapError: (error) => {
          if (error instanceof TriageIntakeError) {
            return error;
          }
          return new TriageIntakeError(
            "persistence-failed",
            "Quick Capture could not be persisted",
            error,
          );
        },
        onCommitted: () => {
          this.diagnostics.record("command.committed", {
            correlationId,
            data: {
              issueId: plan.issue.id,
              kind: "triage.capture",
            },
          });
        },
        onFailed: (error) => {
          this.diagnostics.record("command.failed", {
            correlationId,
            data: {
              category: errorCategory(error),
              issueId: plan.issue.id,
              kind: "triage.capture",
            },
            level: "error",
          });
        },
        optimisticData: { issueId: plan.issue.id },
        plan: logicalPlan,
        queueKind: "triage.capture",
        recover: async () => {
          await this.reconcileAfterFailure(correlationId);
        },
        settle: (persisted) => {
          if (persisted.issues.length > 0) {
            setTriageSourceIssues(this.runtimeStore, persisted.issues);
            this.diagnostics.record("triage.validation.failed", {
              correlationId,
              data: {
                issueCodes: issueCodes(persisted.issues),
                reason: "post-write",
              },
              level: "error",
            });
            throw new TriageIntakeError(
              "verification-failed",
              `Persisted Triage source is invalid: ${invalidSourceMessage(persisted.issues)}`,
            );
          }
          if (persisted.contribution.issuesById[plan.issue.id] === undefined) {
            this.diagnostics.record("triage.validation.failed", {
              correlationId,
              data: {
                issueId: plan.issue.id,
                reason: "created-issue-missing",
              },
              level: "error",
            });
            throw new TriageIntakeError(
              "verification-failed",
              `Persisted Triage source does not contain Issue ${plan.issue.id}`,
            );
          }

          this.diagnostics.record("triage.validation.completed", {
            correlationId,
            data: {
              issueId: plan.issue.id,
              reason: "post-write",
            },
          });
          this.reconcileContribution(persisted.contribution, "capture", correlationId);
        },
      },
      this.diagnostics,
    );

    return {
      completion,
      issue: plan.issue,
    };
  }

  public async refreshFromPersistence(correlationId?: string): Promise<boolean> {
    this.diagnostics.record("triage.persistence.read.started", {
      correlationId,
      data: { reason: "external-refresh" },
    });
    const latest = await this.persistence.readLatest();
    this.diagnostics.record("triage.persistence.read.completed", {
      correlationId,
      data: {
        parseIssueCount: latest.issues.length,
        reason: "external-refresh",
        recordCount: Object.keys(latest.contribution.issuesById).length,
      },
    });
    if (latest.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, latest.issues);
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueCodes: issueCodes(latest.issues),
          reason: "external-refresh",
        },
        level: "warn",
      });
      return false;
    }

    this.reconcileContribution(latest.contribution, "external-refresh", correlationId);
    return true;
  }

  private reconcileContribution(
    contribution: TrailTriageContribution,
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
    this.diagnostics.record("triage.failure-reconcile.started", {
      correlationId,
    });
    try {
      const latest = await this.persistence.readLatest();
      if (latest.issues.length > 0) {
        setTriageSourceIssues(this.runtimeStore, latest.issues);
        this.diagnostics.record("triage.failure-reconcile.invalid", {
          correlationId,
          data: { issueCodes: issueCodes(latest.issues) },
          level: "warn",
        });
        return;
      }
      this.reconcileContribution(
        latest.contribution,
        "failure-reconcile",
        correlationId,
      );
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
      // Preserve the last-known-good committed runtime when the source cannot be
      // reread. The original persistence failure remains the user-visible error.
    }
  }
}
