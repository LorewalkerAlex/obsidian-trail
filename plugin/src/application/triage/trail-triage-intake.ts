import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  isTrailEpochMilliseconds,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import {
  createTrailMutationPlan,
  triageIssueMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import {
  selectEffectiveIssueIdSet,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailTriageSourceSync } from "../../source-sync/triage/trail-triage-source-sync";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  normalizeTrailCommandTitle,
  TrailCommandValidationError,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface QuickCaptureInput {
  readonly title: string;
}

export interface CreateTriageIssueCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly issueId: string;
  readonly resolvedDue: number;
  readonly title: string;
}

export type CreateTriageIssuePlanResult =
  | {
      readonly issue: TrailTriageIssue;
      readonly kind: "ready";
      readonly plan: TrailMutationPlan;
    }
  | {
      readonly kind: "rejected";
      readonly reason: string;
    };

export interface QuickCaptureCommandEnvironment extends TrailCommandEnvironment {
  readonly resolveDefaultDue: (effectiveAt: number) => number;
}

export interface TriageCaptureReceipt {
  readonly completion: Promise<void>;
  readonly issue: TrailTriageIssue;
}

export class QuickCaptureCommandError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "QuickCaptureCommandError";
  }
}

export class TriageIntakeError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TriageIntakeError";
  }
}

/** Freezes IDs, time, normalized title, and injected Due policy before planning. */
export function normalizeQuickCaptureCommand(
  input: QuickCaptureInput,
  environment: QuickCaptureCommandEnvironment,
): CreateTriageIssueCommand {
  try {
    const title = normalizeTrailCommandTitle(input.title, "Quick Capture");
    const effectiveAt = normalizeTrailCommandTime(environment);
    const resolvedDue = environment.resolveDefaultDue(effectiveAt);
    if (!isTrailEpochMilliseconds(resolvedDue)) {
      throw new QuickCaptureCommandError(
        "Quick Capture temporal policy returned an invalid Due",
      );
    }

    return {
      commandId: normalizeTrailCommandId(environment.createId(), "Command ID"),
      effectiveAt,
      issueId: normalizeTrailCommandId(environment.createId(), "Triage Issue ID"),
      resolvedDue,
      title,
    };
  } catch (error: unknown) {
    if (error instanceof QuickCaptureCommandError) throw error;
    if (error instanceof TrailCommandValidationError) {
      throw new QuickCaptureCommandError(error.message, error);
    }
    throw error;
  }
}

/** Plans one legal Triage creation against Effective/Planning state. */
export function planCreateTriageIssue(
  existingIssueIds: ReadonlySet<string>,
  command: CreateTriageIssueCommand,
): CreateTriageIssuePlanResult {
  if (existingIssueIds.has(command.issueId)) {
    return {
      kind: "rejected",
      reason: `Issue ID already exists: ${command.issueId}`,
    };
  }

  const issue: TrailTriageIssue = {
    context: "triage",
    due: command.resolvedDue,
    id: command.issueId,
    labelIds: [],
    title: command.title,
  };
  return {
    issue,
    kind: "ready",
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: triageIssueMutationEntity(issue), kind: "create" }],
      intent: "triage.issue.create",
    }),
  };
}

/** User-facing Quick Capture use case; Triage source mechanics stay in Source Sync. */
export class TrailTriageIntakeService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailTriageSourceSync,
    private readonly commandEnvironment: QuickCaptureCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

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

    const result = planCreateTriageIssue(
      selectEffectiveIssueIdSet(this.runtimeStore.getState()),
      command,
    );
    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: {
          kind: "triage.capture",
          reason: "planning-rejected",
        },
        level: "warn",
      });
      throw new TriageIntakeError(result.reason);
    }

    this.diagnostics.record("command.planned", {
      correlationId,
      data: {
        issueId: result.issue.id,
        intent: result.plan.intent,
      },
    });
    const receipt = this.sourceSync.submit({
      actionKind: "triage.capture",
      correlationId,
      entityId: result.issue.id,
      expectedIssue: result.issue,
      plan: result.plan,
    });
    return {
      completion: receipt.completion,
      issue: result.issue,
    };
  }
}
