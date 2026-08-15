import {
  createTrailMutationPlan,
  triageIssueMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import { submitTrailMutation } from "../../mutation/coordinator/trail-mutation-coordinator";
import { executeTrailSingleTransaction } from "../../mutation/execution/trail-single-transaction-executor";
import { materializeTrailSingleTransactionPlan } from "../../mutation/physical/trail-single-transaction-plan";
import {
  isTrailEpochMilliseconds,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import {
  selectEffectiveTriageIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import {
  reconcileTriageContribution,
  setTriageSourceIssues,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import type {
  TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import {
  TriageMarkdownMutationError,
  type TrailTriageContribution,
  type TrailTriageParseIssue,
  type TrailTriageParseResult,
} from "../../markdown/codecs/trail-triage-codec";
import type { TrailTriageManagementPersistenceGateway } from "../../persistence/domain-sources/trail-triage-persistence";


export type TriageManagementActionKind =
  | "triage.defer"
  | "triage.delete"
  | "triage.edit";

export interface TriageEditInput {
  readonly due: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly title: string;
}

export interface TriageDeferInput {
  readonly due: number;
  readonly expectedIssue: TrailTriageIssue;
}

export interface TriageManagementReceipt {
  readonly completion: Promise<void>;
  readonly issueId: string;
}

export interface TriageManagementCommandEnvironment {
  readonly createId: () => string;
  readonly now: () => number;
}

interface UpdateTriageCommand {
  readonly commandId: string;
  readonly due: number;
  readonly effectiveAt: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly issueId: string;
  readonly kind: "triage.defer" | "triage.edit";
  readonly title?: string;
}

interface DeleteTriageCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly expectedIssue: TrailTriageIssue;
  readonly issueId: string;
  readonly kind: "triage.delete";
}

export type TriageManagementErrorCode =
  | "conflict"
  | "persistence-failed"
  | "planning-rejected"
  | "source-invalid"
  | "verification-failed";

export class TriageManagementError extends Error {
  public constructor(
    readonly code: TriageManagementErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TriageManagementError";
  }
}

export type TriageManagementPlanResult =
  | {
      readonly expectedIssue: TrailTriageIssue;
      readonly kind: "ready";
      readonly nextIssue?: TrailTriageIssue;
      readonly plan: TrailMutationPlan;
    }
  | { readonly kind: "rejected"; readonly reason: string }
  | { readonly kind: "unchanged"; readonly issueId: string };

function invalidSourceMessage(issues: readonly TrailTriageParseIssue[]): string {
  return issues.map((issue) => issue.message).join("; ");
}

function issueCodes(issues: readonly TrailTriageParseIssue[]): readonly string[] {
  return issues.map((issue) => issue.code);
}

function errorCategory(error: unknown): string {
  if (error instanceof TriageManagementError) {
    return error.code;
  }
  if (error instanceof TriageMarkdownMutationError) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.name;
  }
  return "unknown-error";
}

function normalizeIssueId(issueId: string): string {
  const normalized = issueId.trim();
  if (normalized === "") {
    throw new TriageManagementError(
      "planning-rejected",
      "Triage Issue ID must be non-empty text",
    );
  }
  return normalized;
}

function normalizeEffectiveAt(environment: TriageManagementCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new TriageManagementError(
      "planning-rejected",
      "Triage management effective timestamp is invalid",
    );
  }
  return effectiveAt;
}

export function normalizeTriageEditCommand(
  input: TriageEditInput,
  environment: TriageManagementCommandEnvironment,
): UpdateTriageCommand {
  const title = normalizeTrailTitle(input.title);
  if (!isValidTrailTitle(title)) {
    throw new TriageManagementError(
      "planning-rejected",
      "Triage Issue title must be non-empty single-line text",
    );
  }
  if (!isTrailEpochMilliseconds(input.due)) {
    throw new TriageManagementError(
      "planning-rejected",
      "Triage Issue Due must be a valid timestamp",
    );
  }

  return {
    commandId: environment.createId(),
    due: input.due,
    effectiveAt: normalizeEffectiveAt(environment),
    expectedIssue: input.expectedIssue,
    issueId: normalizeIssueId(input.expectedIssue.id),
    kind: "triage.edit",
    title,
  };
}

export function normalizeTriageDeferCommand(
  input: TriageDeferInput,
  environment: TriageManagementCommandEnvironment,
): UpdateTriageCommand {
  if (!isTrailEpochMilliseconds(input.due)) {
    throw new TriageManagementError(
      "planning-rejected",
      "Deferred Triage Due must be a valid timestamp",
    );
  }

  return {
    commandId: environment.createId(),
    due: input.due,
    effectiveAt: normalizeEffectiveAt(environment),
    expectedIssue: input.expectedIssue,
    issueId: normalizeIssueId(input.expectedIssue.id),
    kind: "triage.defer",
  };
}

export function normalizeTriageDeleteCommand(
  expectedIssue: TrailTriageIssue,
  environment: TriageManagementCommandEnvironment,
): DeleteTriageCommand {
  return {
    commandId: environment.createId(),
    effectiveAt: normalizeEffectiveAt(environment),
    expectedIssue,
    issueId: normalizeIssueId(expectedIssue.id),
    kind: "triage.delete",
  };
}

/** Plans a legal identity-preserving edit/defer or an identity-removing delete. */
export function planTriageManagement(
  currentIssue: TrailTriageIssue | undefined,
  command: UpdateTriageCommand | DeleteTriageCommand,
): TriageManagementPlanResult {
  if (currentIssue === undefined) {
    return {
      kind: "rejected",
      reason: `Triage Issue does not exist: ${command.issueId}`,
    };
  }
  if (!sameTrailTriageIssue(currentIssue, command.expectedIssue)) {
    return {
      kind: "rejected",
      reason: `Triage Issue changed before action: ${command.issueId}`,
    };
  }

  if (command.kind === "triage.delete") {
    return {
      expectedIssue: currentIssue,
      kind: "ready",
      plan: createTrailMutationPlan({
        commandId: command.commandId,
        effects: [{ before: triageIssueMutationEntity(currentIssue), kind: "delete" }],
        intent: "triage.issue.delete",
      }),
    };
  }

  if (command.kind === "triage.defer" && command.due <= currentIssue.due) {
    return {
      kind: "rejected",
      reason: "Triage Defer must move Due later",
    };
  }

  const issue: TrailTriageIssue = {
    ...currentIssue,
    due: command.due,
    title: command.title ?? currentIssue.title,
  };
  if (sameTrailTriageIssue(issue, currentIssue)) {
    return { kind: "unchanged", issueId: currentIssue.id };
  }

  return {
    expectedIssue: currentIssue,
    kind: "ready",
    nextIssue: issue,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: triageIssueMutationEntity(issue),
        before: triageIssueMutationEntity(currentIssue),
        kind: "replace",
      }],
      intent: "triage.issue.replace",
    }),
  };
}

/**
 * Runs Triage management through one feature-agnostic logical plan and the shared
 * mutation coordinator. Feature code keeps only semantic verification, reconcile,
 * recovery, and user-facing error mapping.
 */
export class TrailTriageManagementService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailTriageManagementPersistenceGateway,
    private readonly commandEnvironment: TriageManagementCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public edit(input: TriageEditInput): TriageManagementReceipt {
    return this.execute(normalizeTriageEditCommand(input, this.commandEnvironment));
  }

  public defer(input: TriageDeferInput): TriageManagementReceipt {
    return this.execute(normalizeTriageDeferCommand(input, this.commandEnvironment));
  }

  public delete(expectedIssue: TrailTriageIssue): TriageManagementReceipt {
    return this.execute(normalizeTriageDeleteCommand(expectedIssue, this.commandEnvironment));
  }

  private execute(
    command: UpdateTriageCommand | DeleteTriageCommand,
  ): TriageManagementReceipt {
    const correlationId = command.commandId;
    this.diagnostics.record("command.created", {
      correlationId,
      data: {
        due: command.kind === "triage.delete" ? null : command.due,
        effectiveAt: command.effectiveAt,
        issueId: command.issueId,
        kind: command.kind,
        titleLength:
          command.kind === "triage.edit" ? command.title?.length ?? 0 : null,
      },
    });

    const currentIssue = selectEffectiveTriageIssueById(
      this.runtimeStore.getState(),
      command.issueId,
    );
    const result = planTriageManagement(currentIssue, command);
    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new TriageManagementError("planning-rejected", result.reason);
    }
    if (result.kind === "unchanged") {
      this.diagnostics.record("command.noop", {
        correlationId,
        data: { issueId: result.issueId, kind: command.kind },
      });
      return {
        completion: Promise.resolve(),
        issueId: result.issueId,
      };
    }

    const { expectedIssue, nextIssue, plan: logicalPlan } = result;
    this.diagnostics.record("command.planned", {
      correlationId,
      data: { issueId: command.issueId, kind: command.kind },
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
              issueId: command.issueId,
              kind: command.kind,
              path: physicalPlan.sourcePath,
            },
          });
          const executed = await executeTrailSingleTransaction(
            physicalPlan,
            { triageManage: this.persistence },
            correlationId,
          );
          if (executed.kind !== "triage-source") {
            throw new TriageManagementError(
              "verification-failed",
              "Triage management physical execution returned the wrong source kind",
            );
          }
          const persisted = executed.result;
          this.diagnostics.record("triage.persistence.write.completed", {
            correlationId,
            data: {
              kind: command.kind,
              parseIssueCount: persisted.issues.length,
              recordCount: Object.keys(persisted.contribution.issuesById).length,
            },
          });
          return persisted;
        },
        mapError: (error) => this.mapMutationError(error),
        onCommitted: () => {
          this.diagnostics.record("command.committed", {
            correlationId,
            data: { issueId: command.issueId, kind: command.kind },
          });
        },
        onFailed: (error) => {
          this.diagnostics.record("command.failed", {
            correlationId,
            data: {
              category: errorCategory(error),
              issueId: command.issueId,
              kind: command.kind,
            },
            level: "error",
          });
        },
        optimisticData: { issueId: command.issueId },
        plan: logicalPlan,
        queueKind: command.kind,
        recover: async () => {
          await this.reconcileAfterFailure(correlationId);
        },
        settle: (persisted) => {
          this.verifyPersistedResult(expectedIssue, nextIssue, persisted, correlationId, command.kind);
          this.reconcileContribution(persisted.contribution, command.kind, correlationId);
        },
      },
      this.diagnostics,
    );

    return { completion, issueId: command.issueId };
  }

  private verifyPersistedResult(
    expectedIssue: TrailTriageIssue,
    nextIssue: TrailTriageIssue | undefined,
    persisted: TrailTriageParseResult,
    correlationId: string,
    kind: TriageManagementActionKind,
  ): void {
    if (persisted.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, persisted.issues);
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueCodes: issueCodes(persisted.issues),
          kind,
          reason: "post-write",
        },
        level: "error",
      });
      throw new TriageManagementError(
        "verification-failed",
        `Persisted Triage source is invalid: ${invalidSourceMessage(persisted.issues)}`,
      );
    }

    const persistedIssue = persisted.contribution.issuesById[expectedIssue.id];
    const valid = nextIssue === undefined
      ? persistedIssue === undefined
      : persistedIssue !== undefined && sameTrailTriageIssue(persistedIssue, nextIssue);
    if (!valid) {
      this.diagnostics.record("triage.validation.failed", {
        correlationId,
        data: {
          issueId: expectedIssue.id,
          kind,
          reason: "post-write-result-mismatch",
        },
        level: "error",
      });
      throw new TriageManagementError(
        "verification-failed",
        "Persisted Triage mutation did not match the planned result",
      );
    }

    this.diagnostics.record("triage.validation.completed", {
      correlationId,
      data: {
        issueId: expectedIssue.id,
        kind,
        reason: "post-write",
      },
    });
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
    this.diagnostics.record("triage.failure-reconcile.started", { correlationId });
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
      this.reconcileContribution(latest.contribution, "failure-reconcile", correlationId);
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

  private mapMutationError(error: unknown): TriageManagementError {
    if (error instanceof TriageManagementError) {
      return error;
    }
    if (error instanceof TriageMarkdownMutationError) {
      if (error.code === "conflict" || error.code === "target-missing") {
        return new TriageManagementError(
          "conflict",
          "Triage Issue changed outside Trail. Review the latest state and try again.",
          error,
        );
      }
      if (error.code === "source-invalid") {
        return new TriageManagementError(
          "source-invalid",
          "Triage.md became invalid before the mutation could be saved",
          error,
        );
      }
      return new TriageManagementError(
        "verification-failed",
        "Triage Markdown mutation failed verification",
        error,
      );
    }
    return new TriageManagementError(
      "persistence-failed",
      "Triage change could not be persisted",
      error,
    );
  }
}
