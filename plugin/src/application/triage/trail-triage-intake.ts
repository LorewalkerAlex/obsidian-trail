import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailTriageIssue } from "../../domain/trail-issue";
import {
  selectEffectiveIssueIdSet,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailTriageSourceSync } from "../../source-sync/triage/trail-triage-source-sync";
import {
  normalizeQuickCaptureCommand,
  planCreateTriageIssue,
  type QuickCaptureCommandEnvironment,
  type QuickCaptureInput,
} from "./trail-triage-command";

export interface TriageCaptureReceipt {
  readonly completion: Promise<void>;
  readonly issue: TrailTriageIssue;
}

export class TriageIntakeError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TriageIntakeError";
  }
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
