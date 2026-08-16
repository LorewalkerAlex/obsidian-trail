import type {
  TrailLabelEntityType,
  TrailLabelGroupId,
  TrailLabelId,
  TrailLabelSelectionMode,
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

export type TrailEntityStatusConfiguration = Readonly<
  Record<TrailStatusCategory, TrailStatusCategoryConfiguration>
>;

export interface TrailWorkflowStatusConfiguration {
  readonly issue: TrailEntityStatusConfiguration;
  readonly project: TrailEntityStatusConfiguration;
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
  readonly cycle: TrailCycleConfiguration;
  readonly temporal: TrailTemporalConfiguration;
}
