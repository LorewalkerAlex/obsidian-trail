import type {
  TrailEstimate,
  TrailLabelEntityType,
  TrailLabelGroupId,
  TrailLabelId,
  TrailLabelSelectionMode,
  TrailProjectStatusCategory,
  TrailStatusCategory,
  TrailStatusDefinitionId,
  TrailStatusEntityType,
} from "./trail-values";

export interface TrailStatusDefinition {
  readonly id: TrailStatusDefinitionId;
  readonly name: string;
  readonly entityType: TrailStatusEntityType;
  readonly category: TrailStatusCategory;
}

export interface TrailStatusCategoryConfiguration {
  readonly defaultId: TrailStatusDefinitionId;
  /** Order is authoritative within one entity type / Status Category. */
  readonly definitionIds: readonly TrailStatusDefinitionId[];
}

export type TrailIssueStatusConfiguration = Readonly<
  Record<TrailStatusCategory, TrailStatusCategoryConfiguration>
>;

export type TrailProjectStatusConfiguration = Readonly<
  Record<TrailProjectStatusCategory, TrailStatusCategoryConfiguration>
>;

export type TrailEntityStatusConfiguration =
  | TrailIssueStatusConfiguration
  | TrailProjectStatusConfiguration;

export interface TrailWorkflowStatusConfiguration {
  readonly issue: TrailIssueStatusConfiguration;
  readonly project: TrailProjectStatusConfiguration;
}

export interface TrailLabelGroup {
  readonly id: TrailLabelGroupId;
  readonly name: string;
  readonly selectionMode: TrailLabelSelectionMode;
  /** Applicability is a logical set; array order has no business meaning. */
  readonly registeredEntityTypes: readonly TrailLabelEntityType[];
}

export interface TrailLabel {
  readonly id: TrailLabelId;
  readonly name: string;
  readonly groupId: TrailLabelGroupId;
}

/** Numeric aggregation policy for the fixed T-Shirt Estimate vocabulary. */
export type TrailEstimateWeightConfiguration = Readonly<Record<TrailEstimate, number>>;

export interface TrailCycleConfiguration {
  readonly defaultEndRule: "end-of-next-week";
}

export interface TrailTemporalConfiguration {
  readonly timezone: string;
  /** Presentation formats are configurable, but remain outside canonical Entity facts. */
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  readonly dateTimeFormat?: string;
}

/** Normalized logical Configuration consumed by validation, planning, and queries. */
export interface TrailConfiguration {
  readonly statusDefinitions: readonly TrailStatusDefinition[];
  readonly workflowStatuses: TrailWorkflowStatusConfiguration;
  readonly labelGroups: readonly TrailLabelGroup[];
  readonly labels: readonly TrailLabel[];
  readonly estimateWeights: TrailEstimateWeightConfiguration;
  readonly cycle: TrailCycleConfiguration;
  readonly temporal: TrailTemporalConfiguration;
}
