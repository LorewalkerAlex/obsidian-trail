import { TrailMutationQueue } from "./trail-mutation-queue";
import type { TrailTriageIssue } from "./trail-issue";
import {
  addPendingPlan,
  reconcileTriageContribution,
  removePendingPlan,
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
  TrailTriageParseIssue,
  TrailTriageParseResult,
} from "./trail-triage-markdown";

export interface TrailTriagePersistenceGateway {
  readonly appendIssue: (issue: TrailTriageIssue) => Promise<TrailTriageParseResult>;
  readonly readLatest: () => Promise<TrailTriageParseResult>;
}

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

/**
 * Application service for the first Formal vertical path. It owns command
 * normalization, optimistic projection, queue ordering, persistence verification,
 * and committed-runtime reconciliation; the Markdown gateway owns physical I/O.
 */
export class TrailTriageIntakeService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailTriagePersistenceGateway,
    private readonly commandEnvironment: QuickCaptureCommandEnvironment,
  ) {}

  public async initialize(): Promise<void> {
    const latest = await this.persistence.readLatest();
    if (latest.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, latest.issues);
      throw new TriageIntakeError(
        "initialization-invalid",
        `Triage source is invalid: ${invalidSourceMessage(latest.issues)}`,
      );
    }

    reconcileTriageContribution(this.runtimeStore, latest.contribution);
  }

  /**
   * Publishes the pending plan synchronously and returns a separate completion
   * promise. React can therefore render the new Issue before Markdown I/O finishes.
   */
  public capture(input: QuickCaptureInput): TriageCaptureReceipt {
    const command = normalizeQuickCaptureCommand(
      input,
      this.commandEnvironment,
    );
    const planningIds = selectEffectiveIssueIdSet(
      this.runtimeStore.getState(),
    );
    const result = planCreateTriageIssue(planningIds, command);

    if (result.kind === "rejected") {
      throw new TriageIntakeError(
        "planning-rejected",
        result.reason,
      );
    }

    const { plan } = result;
    addPendingPlan(this.runtimeStore, plan);

    const completion = this.mutationQueue.enqueue(async () => {
      try {
        const persisted = await this.persistence.appendIssue(plan.issue);
        if (persisted.issues.length > 0) {
          setTriageSourceIssues(this.runtimeStore, persisted.issues);
          throw new TriageIntakeError(
            "verification-failed",
            `Persisted Triage source is invalid: ${invalidSourceMessage(persisted.issues)}`,
          );
        }
        if (persisted.contribution.issuesById[plan.issue.id] === undefined) {
          throw new TriageIntakeError(
            "verification-failed",
            `Persisted Triage source does not contain Issue ${plan.issue.id}`,
          );
        }

        reconcileTriageContribution(
          this.runtimeStore,
          persisted.contribution,
        );
        removePendingPlan(this.runtimeStore, plan.commandId);
      } catch (error: unknown) {
        await this.reconcileAfterFailure();
        removePendingPlan(this.runtimeStore, plan.commandId);

        if (error instanceof TriageIntakeError) {
          throw error;
        }
        throw new TriageIntakeError(
          "persistence-failed",
          "Quick Capture could not be persisted",
          error,
        );
      }
    });

    return {
      completion,
      issue: plan.issue,
    };
  }

  public async refreshFromPersistence(): Promise<boolean> {
    const latest = await this.persistence.readLatest();
    if (latest.issues.length > 0) {
      setTriageSourceIssues(this.runtimeStore, latest.issues);
      return false;
    }

    reconcileTriageContribution(this.runtimeStore, latest.contribution);
    return true;
  }

  private async reconcileAfterFailure(): Promise<void> {
    try {
      const latest = await this.persistence.readLatest();
      if (latest.issues.length > 0) {
        setTriageSourceIssues(this.runtimeStore, latest.issues);
        return;
      }
      reconcileTriageContribution(this.runtimeStore, latest.contribution);
    } catch {
      // Preserve the last-known-good committed runtime when the source cannot be
      // reread. The original persistence failure remains the user-visible error.
    }
  }
}
