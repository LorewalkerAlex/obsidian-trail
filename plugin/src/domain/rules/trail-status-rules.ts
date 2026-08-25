import type {
  TrailConfiguration,
  TrailStatusCategoryConfiguration,
  TrailStatusDefinition,
} from "../model/trail-configuration";
import {
  isTrailStatusCategoryForEntityType,
  type TrailProjectStatusCategory,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../model/trail-values";

export function findTrailStatusDefinition(
  configuration: TrailConfiguration,
  definitionId: string,
): TrailStatusDefinition | undefined {
  return configuration.statusDefinitions.find(({ id }) => id === definitionId);
}

export function resolveTrailStatusDefinition(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  definitionId: string,
): TrailStatusDefinition | undefined {
  const definition = findTrailStatusDefinition(configuration, definitionId);
  return definition?.entityType === entityType ? definition : undefined;
}

function requireTrailStatusCategoryConfiguration(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
): TrailStatusCategoryConfiguration {
  if (!isTrailStatusCategoryForEntityType(entityType, category)) {
    throw new Error(`Unsupported ${entityType} Status Category: ${category}`);
  }
  const entityStatuses = configuration.workflowStatuses[entityType] as Readonly<
    Partial<Record<TrailStatusCategory, TrailStatusCategoryConfiguration>>
  >;
  const categoryConfiguration = entityStatuses[category];
  if (categoryConfiguration === undefined) {
    throw new Error(`Missing ${entityType} Status Category: ${category}`);
  }
  return categoryConfiguration;
}

/** Resolves the mutable default definition without treating its display name as system semantics. */
export function resolveTrailDefaultStatusDefinition(
  configuration: TrailConfiguration,
  entityType: "issue",
  category: TrailStatusCategory,
): TrailStatusDefinition;
export function resolveTrailDefaultStatusDefinition(
  configuration: TrailConfiguration,
  entityType: "project",
  category: TrailProjectStatusCategory,
): TrailStatusDefinition;
export function resolveTrailDefaultStatusDefinition(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
): TrailStatusDefinition {
  const categoryConfiguration = requireTrailStatusCategoryConfiguration(
    configuration,
    entityType,
    category,
  );
  const definition = resolveTrailStatusDefinition(
    configuration,
    entityType,
    categoryConfiguration.defaultId,
  );
  if (definition === undefined || definition.category !== category) {
    throw new Error(`Invalid default ${entityType} StatusDefinition for ${category}`);
  }
  return definition;
}

export function isTrailTerminalStatusDefinition(
  definition: TrailStatusDefinition,
): boolean {
  return definition.category === "completed" || definition.category === "canceled";
}
