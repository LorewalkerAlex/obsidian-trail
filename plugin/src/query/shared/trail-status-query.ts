import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_STATUS_CATEGORIES,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";

export interface TrailStatusOptionGroup {
  readonly category: TrailStatusCategory;
  readonly definitions: readonly TrailStatusDefinition[];
}

export function selectTrailStatusDefinition(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  statusDefinitionId: string,
): TrailStatusDefinition | undefined {
  return configuration.statusDefinitions.find((definition) => (
    definition.entityType === entityType && definition.id === statusDefinitionId
  ));
}

/** Preserves Configuration-defined ordering inside each fixed Status Category. */
export function selectTrailStatusOptionGroups(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
): readonly TrailStatusOptionGroup[] {
  const definitionsById = new Map(
    configuration.statusDefinitions
      .filter((definition) => definition.entityType === entityType)
      .map((definition) => [definition.id, definition] as const),
  );
  const categories = configuration.workflowStatuses[entityType];

  return TRAIL_STATUS_CATEGORIES.map((category) => ({
    category,
    definitions: categories[category].definitionIds
      .map((definitionId) => definitionsById.get(definitionId))
      .filter((definition): definition is TrailStatusDefinition => definition !== undefined),
  }));
}
