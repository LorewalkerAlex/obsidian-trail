import type {
  TrailConfiguration,
  TrailStatusDefinition,
} from "../model/trail-configuration";
import type {
  TrailStatusCategory,
  TrailStatusEntityType,
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

/** Resolves the mutable default definition without treating its display name as system semantics. */
export function resolveTrailDefaultStatusDefinition(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
): TrailStatusDefinition {
  const categoryConfiguration = configuration.workflowStatuses[entityType][category];
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
