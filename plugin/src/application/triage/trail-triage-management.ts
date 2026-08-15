import {
  createTrailMutationPlan,
  triageIssueMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  isTrailEpochMilliseconds,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailTriageIssue,
  type TrailTriageIssue,
} from "../../domain/trail-issue";
import {
  selectEffectiveTriageIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailTriageSourceSync } from "../../source-sync/triage/trail-triage-source-sync";

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

export class TriageManagementError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
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

function normalizeIssueId(issueId: string): string {
  const normalized = issueId.trim();
  if (normalized === "") {
    throw new TriageManagementError("Triage Issue ID must be non-empty text");
  }
  return normalized;
}

function normalizeEffectiveAt(environment: TriageManagementCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new TriageManagementError("Triage management effective timestamp is invalid");
  }
  return effectiveAt;
}

export function normalizeTriageEditCommand(
  input: TriageEditInput,
  environment: TriageManagementCommandEnvironment,
): UpdateTriageCommand {
  const title = normalizeTrailTitle(input.title);
  if (!isValidTrailTitle(title)) {
    throw new TriageManagementError("Triage Issue title must be non-empty single-line text");
  }
  if (!isTrailEpochMilliseconds(input.due)) {
    throw new TriageManagementError("Triage Issue Due must be a valid timestamp");
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
    throw new TriageManagementError("Deferred Triage Due must be a valid timestamp");
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

/** User-facing Triage edit/defer/delete use cases; source mechanics stay in Source Sync. */
export class TrailTriageManagementService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailTriageSourceSync,
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

    const result = planTriageManagement(
      selectEffectiveTriageIssueById(
        this.runtimeStore.getState(),
        command.issueId,
      ),
      command,
    );
    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new TriageManagementError(result.reason);
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

    this.diagnostics.record("command.planned", {
      correlationId,
      data: { issueId: command.issueId, kind: command.kind },
    });
    const receipt = this.sourceSync.submit({
      actionKind: command.kind,
      correlationId,
      entityId: command.issueId,
      expectedIssue: result.nextIssue,
      plan: result.plan,
    });
    return { completion: receipt.completion, issueId: command.issueId };
  }
}
