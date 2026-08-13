export const TRAIL_PRIORITIES = [
  "urgent",
  "high",
  "medium",
  "low",
] as const;

export type TrailPriority = (typeof TRAIL_PRIORITIES)[number];

/**
 * Formal Triage projection of Issue facts needed by the first intake slice.
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
