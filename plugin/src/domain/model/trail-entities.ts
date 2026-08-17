import type {
  TrailCycleId,
  TrailInitiativeId,
  TrailIssueId,
  TrailEstimate,
  TrailLabelId,
  TrailMilestoneId,
  TrailPriority,
  TrailProjectId,
  TrailStatusDefinitionId,
  TrailTimestamp,
} from "./trail-values";

export interface TrailInitiative {
  readonly id: TrailInitiativeId;
  readonly title: string;
  readonly description?: string;
  readonly priority?: TrailPriority;
  readonly due?: TrailTimestamp;
  /** Label membership is a logical set; array order has no business meaning. */
  readonly labelIds: readonly TrailLabelId[];
}

export interface TrailProject {
  readonly id: TrailProjectId;
  readonly title: string;
  readonly description?: string;
  readonly statusDefinitionId: TrailStatusDefinitionId;
  readonly initiativeId?: TrailInitiativeId;
  readonly priority?: TrailPriority;
  readonly due?: TrailTimestamp;
  /** Label membership is a logical set; array order has no business meaning. */
  readonly labelIds: readonly TrailLabelId[];
}

export interface TrailMilestone {
  readonly id: TrailMilestoneId;
  readonly title: string;
  readonly description?: string;
  readonly projectId: TrailProjectId;
  readonly due?: TrailTimestamp;
}

interface TrailIssueBase {
  readonly id: TrailIssueId;
  readonly title: string;
  readonly description?: string;
  readonly projectId?: TrailProjectId;
  readonly milestoneId?: TrailMilestoneId;
  readonly priority?: TrailPriority;
  readonly estimate?: TrailEstimate;
  readonly labelIds: readonly TrailLabelId[];
}

/** Triage uses Due as the next review point and has no normal workflow status. */
export interface TrailTriageIssue extends TrailIssueBase {
  readonly context: "triage";
  readonly due: TrailTimestamp;
}

/** Workflow creation time is immutable and records entry into the workflow universe. */
export interface TrailWorkflowIssue extends TrailIssueBase {
  readonly context: "workflow";
  readonly statusDefinitionId: TrailStatusDefinitionId;
  readonly due?: TrailTimestamp;
  readonly createdAt: TrailTimestamp;
  readonly firstStartedAt?: TrailTimestamp;
  readonly terminalAt?: TrailTimestamp;
}

export type TrailIssue = TrailTriageIssue | TrailWorkflowIssue;

export interface TrailCycle {
  readonly id: TrailCycleId;
  readonly startedAt: TrailTimestamp;
  readonly plannedEnd: TrailTimestamp;
  readonly endedAt?: TrailTimestamp;
  /** Cycle membership is a logical set; closed cycles retain their final membership. */
  readonly issueIds: readonly TrailIssueId[];
}

export type TrailCoreEntity =
  | TrailInitiative
  | TrailProject
  | TrailMilestone
  | TrailIssue
  | TrailCycle;

/** Generic dispatch wrapper; `kind` is implementation metadata, not a persisted Entity field. */
export type TrailDomainEntity =
  | { readonly kind: "initiative"; readonly value: TrailInitiative }
  | { readonly kind: "project"; readonly value: TrailProject }
  | { readonly kind: "milestone"; readonly value: TrailMilestone }
  | { readonly kind: "issue"; readonly value: TrailIssue }
  | { readonly kind: "cycle"; readonly value: TrailCycle };
