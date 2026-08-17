export type TrailInitiativeId = string;
export type TrailProjectId = string;
export type TrailMilestoneId = string;
export type TrailIssueId = string;
export type TrailCycleId = string;
export type TrailStatusDefinitionId = string;
export type TrailLabelGroupId = string;
export type TrailLabelId = string;
export type TrailCustomViewId = string;

/** Persisted Trail timestamps are Unix epoch milliseconds. */
export type TrailTimestamp = number;

/** Estimate is an ordinal work-size carrier; the allowed scale remains configurable/deferred. */
export type TrailEstimate = number;

export const TRAIL_PRIORITIES = [
  "urgent",
  "high",
  "medium",
  "low",
] as const;
export type TrailPriority = (typeof TRAIL_PRIORITIES)[number];

export const TRAIL_STATUS_CATEGORIES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const;
export type TrailStatusCategory = (typeof TRAIL_STATUS_CATEGORIES)[number];

export const TRAIL_ISSUE_CONTEXTS = ["triage", "workflow"] as const;
export type TrailIssueContext = (typeof TRAIL_ISSUE_CONTEXTS)[number];

export const TRAIL_STATUS_ENTITY_TYPES = ["issue", "project"] as const;
export type TrailStatusEntityType = (typeof TRAIL_STATUS_ENTITY_TYPES)[number];

export const TRAIL_LABEL_ENTITY_TYPES = [
  "initiative",
  "project",
  "issue",
] as const;
export type TrailLabelEntityType = (typeof TRAIL_LABEL_ENTITY_TYPES)[number];

export const TRAIL_LABEL_SELECTION_MODES = ["single", "multiple"] as const;
export type TrailLabelSelectionMode = (typeof TRAIL_LABEL_SELECTION_MODES)[number];
