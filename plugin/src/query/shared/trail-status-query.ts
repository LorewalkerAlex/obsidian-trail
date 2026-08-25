import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";

export interface TrailStatusOptionGroup {
  readonly category: TrailStatusCategory;
  readonly defaultId: string;
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

  if (entityType === "issue") {
    return TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue.map((category) => {
      const categoryConfiguration = configuration.workflowStatuses.issue[category];
      return {
        category,
        defaultId: categoryConfiguration.defaultId,
        definitions: categoryConfiguration.definitionIds
          .map((definitionId) => definitionsById.get(definitionId))
          .filter((definition): definition is TrailStatusDefinition => definition !== undefined),
      };
    });
  }

  return TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project.map((category) => {
    const categoryConfiguration = configuration.workflowStatuses.project[category];
    return {
      category,
      defaultId: categoryConfiguration.defaultId,
      definitions: categoryConfiguration.definitionIds
        .map((definitionId) => definitionsById.get(definitionId))
        .filter((definition): definition is TrailStatusDefinition => definition !== undefined),
    };
  });
}
