import {
  isTrailEpochMilliseconds,
  isValidTrailTitle,
  normalizeTrailTitle,
  type TrailTriageIssue,
} from "./trail-issue";

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

export interface CreateTriageIssuePlan {
  readonly commandId: string;
  readonly issue: TrailTriageIssue;
  readonly kind: "create-triage-issue";
}

export type CreateTriageIssuePlanResult =
  | {
      readonly kind: "ready";
      readonly plan: CreateTriageIssuePlan;
    }
  | {
      readonly kind: "rejected";
      readonly reason: string;
    };

export interface QuickCaptureCommandEnvironment {
  readonly createId: () => string;
  readonly now: () => number;
  readonly resolveDefaultDue: (effectiveAt: number) => number;
}

export class QuickCaptureCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "QuickCaptureCommandError";
  }
}

/**
 * Freezes all non-deterministic inputs before Domain planning. Calendar/timezone
 * policy stays injected here instead of leaking into the pure planner.
 */
export function normalizeQuickCaptureCommand(
  input: QuickCaptureInput,
  environment: QuickCaptureCommandEnvironment,
): CreateTriageIssueCommand {
  const title = normalizeTrailTitle(input.title);
  if (!isValidTrailTitle(title)) {
    throw new QuickCaptureCommandError(
      "Quick Capture title must be non-empty single-line text",
    );
  }

  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new QuickCaptureCommandError(
      "Quick Capture effective timestamp is invalid",
    );
  }

  const resolvedDue = environment.resolveDefaultDue(effectiveAt);
  if (!isTrailEpochMilliseconds(resolvedDue)) {
    throw new QuickCaptureCommandError(
      "Quick Capture temporal policy returned an invalid Due",
    );
  }

  return {
    commandId: environment.createId(),
    effectiveAt,
    issueId: environment.createId(),
    resolvedDue,
    title,
  };
}

/**
 * Plans one legal Triage creation against Effective/Planning state. The current
 * slice only needs stable-ID uniqueness; later Issue mutations add more effects.
 */
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

  return {
    kind: "ready",
    plan: {
      commandId: command.commandId,
      issue: {
        context: "triage",
        due: command.resolvedDue,
        id: command.issueId,
        labelIds: [],
        title: command.title,
      },
      kind: "create-triage-issue",
    },
  };
}
