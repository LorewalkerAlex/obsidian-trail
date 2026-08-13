export const TRAIL_PRIORITIES = [
  "urgent",
  "high",
  "medium",
  "low",
] as const;

export type TrailPriority = (typeof TRAIL_PRIORITIES)[number];

/**
 * Formal Triage projection of Issue facts needed by the intake surface.
 * Workflow-only lifecycle fields deliberately do not exist on this type.
 */
export interface TrailTriageIssue {
  readonly context: "triage";
  readonly description?: string;
  readonly due: number;
  /** Physical numeric carrier only; the final allowed Estimate scale is not frozen here. */
  readonly estimate?: number;
  readonly id: string;
  readonly labelIds: readonly string[];
  readonly milestoneId?: string;
  readonly priority?: TrailPriority;
  readonly projectId?: string;
  readonly title: string;
}

/** Formal Workflow Issue facts used by the first executable Workflow slice. */
export interface TrailWorkflowIssue {
  readonly context: "workflow";
  readonly createdAt: number;
  readonly description?: string;
  readonly due?: number;
  /** Physical numeric carrier; final Estimate scale remains a later Configuration choice. */
  readonly estimate?: number;
  readonly firstStartedAt?: number;
  readonly id: string;
  readonly labelIds: readonly string[];
  readonly milestoneId?: string;
  readonly priority?: TrailPriority;
  readonly projectId?: string;
  readonly statusDefinitionId: string;
  readonly terminalAt?: number;
  readonly title: string;
}

export interface TrailRecordSourceRange {
  readonly endOffset: number;
  readonly filePath: string;
  readonly markerEndOffset: number;
  readonly markerStartOffset: number;
  readonly startOffset: number;
}

export function isTrailPriority(value: unknown): value is TrailPriority {
  return (
    typeof value === "string"
    && (TRAIL_PRIORITIES as readonly string[]).includes(value)
  );
}

export function isTrailEpochMilliseconds(value: unknown): value is number {
  return (
    typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

export function isTrailEstimateCarrier(value: unknown): value is number {
  return (
    typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

export function normalizeTrailTitle(value: string): string {
  return value.trim();
}

export function isValidTrailTitle(value: string): boolean {
  const normalized = normalizeTrailTitle(value);
  return (
    normalized.length > 0
    && !normalized.includes("\n")
    && !normalized.includes("\r")
  );
}

export function sameTrailStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length
    && left.every((value, index) => value === right[index])
  );
}

/** Compares the canonical facts carried by a Formal Triage Issue. */
export function sameTrailTriageIssue(
  left: TrailTriageIssue,
  right: TrailTriageIssue,
): boolean {
  return (
    left.id === right.id
    && left.context === right.context
    && left.title === right.title
    && left.description === right.description
    && left.due === right.due
    && left.priority === right.priority
    && left.estimate === right.estimate
    && left.projectId === right.projectId
    && left.milestoneId === right.milestoneId
    && sameTrailStringArray(left.labelIds, right.labelIds)
  );
}

/** Compares the canonical facts carried by a Formal Workflow Issue. */
export function sameTrailWorkflowIssue(
  left: TrailWorkflowIssue,
  right: TrailWorkflowIssue,
): boolean {
  return (
    left.id === right.id
    && left.context === right.context
    && left.title === right.title
    && left.description === right.description
    && left.statusDefinitionId === right.statusDefinitionId
    && left.projectId === right.projectId
    && left.milestoneId === right.milestoneId
    && left.priority === right.priority
    && left.estimate === right.estimate
    && left.due === right.due
    && sameTrailStringArray(left.labelIds, right.labelIds)
    && left.createdAt === right.createdAt
    && left.firstStartedAt === right.firstStartedAt
    && left.terminalAt === right.terminalAt
  );
}
