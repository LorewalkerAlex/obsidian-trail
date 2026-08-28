export type TrailWorkflowIssueDragData = Record<string | symbol, unknown> & {
  readonly type: "trail-workflow-issue";
  readonly instanceId: symbol;
  readonly issueId: string;
  readonly projectId: string;
  readonly sourceStatusDefinitionId: string;
};

export type TrailWorkflowStatusDropData = Record<string | symbol, unknown> & {
  readonly type: "trail-workflow-status";
  readonly instanceId: symbol;
  readonly projectId: string;
  readonly targetStatusDefinitionId: string;
};

export interface TrailWorkflowStatusDropIntent {
  readonly issueId: string;
  readonly targetStatusDefinitionId: string;
}

/** Builds typed drag data without exposing presentation state as Domain data. */
export function createTrailWorkflowIssueDragData(input: {
  readonly instanceId: symbol;
  readonly issueId: string;
  readonly projectId: string;
  readonly sourceStatusDefinitionId: string;
}): TrailWorkflowIssueDragData {
  return { ...input, type: "trail-workflow-issue" };
}

/** Builds one Status-cell target inside a specific Board instance and Project lane. */
export function createTrailWorkflowStatusDropData(input: {
  readonly instanceId: symbol;
  readonly projectId: string;
  readonly targetStatusDefinitionId: string;
}): TrailWorkflowStatusDropData {
  return { ...input, type: "trail-workflow-status" };
}

export function isTrailWorkflowIssueDragData(value: unknown): value is TrailWorkflowIssueDragData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TrailWorkflowIssueDragData>;
  return candidate.type === "trail-workflow-issue"
    && typeof candidate.instanceId === "symbol"
    && typeof candidate.issueId === "string"
    && typeof candidate.projectId === "string"
    && typeof candidate.sourceStatusDefinitionId === "string";
}

export function isTrailWorkflowStatusDropData(value: unknown): value is TrailWorkflowStatusDropData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<TrailWorkflowStatusDropData>;
  return candidate.type === "trail-workflow-status"
    && typeof candidate.instanceId === "symbol"
    && typeof candidate.projectId === "string"
    && typeof candidate.targetStatusDefinitionId === "string";
}

/**
 * Board drag changes Status only. A target is valid only inside the same Board
 * instance and the same Project swimlane; relationships are never drag targets.
 */
export function canTrailWorkflowIssueDropInStatus(
  source: unknown,
  target: unknown,
): boolean {
  return isTrailWorkflowIssueDragData(source)
    && isTrailWorkflowStatusDropData(target)
    && source.instanceId === target.instanceId
    && source.projectId === target.projectId;
}

/** Resolves one meaningful Status change; same-Status drops are presentation no-ops. */
export function resolveTrailWorkflowStatusDrop(
  source: unknown,
  target: unknown,
): TrailWorkflowStatusDropIntent | undefined {
  if (!canTrailWorkflowIssueDropInStatus(source, target)) return undefined;
  if (!isTrailWorkflowIssueDragData(source) || !isTrailWorkflowStatusDropData(target)) {
    return undefined;
  }
  if (source.sourceStatusDefinitionId === target.targetStatusDefinitionId) return undefined;
  return {
    issueId: source.issueId,
    targetStatusDefinitionId: target.targetStatusDefinitionId,
  };
}
