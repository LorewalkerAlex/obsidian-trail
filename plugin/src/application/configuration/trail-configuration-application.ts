import type {
  TrailConfiguration,
  TrailLabel,
  TrailLabelGroup,
  TrailStatusDefinition,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
  TRAIL_STATUS_CATEGORIES,
  TRAIL_STATUS_ENTITY_TYPES,
  type TrailLabelEntityType,
  type TrailLabelSelectionMode,
  type TrailStatusCategory,
  type TrailStatusEntityType,
} from "../../domain/model/trail-values";
import { planChangeTrailConfiguration } from "../../domain/planning/trail-configuration-planning";
import { sameTrailConfiguration } from "../../domain/rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../../domain/rules/trail-label-rules";
import { findTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../../source-sync/trail-authoritative-source-sync";
import {
  readTrailPlanningState,
  resolveTrailApplicationPlan,
  submitTrailApplicationMutationPlan,
  TrailApplicationPlanningError,
  type TrailMutationCommandResult,
} from "../trail-application-support";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  TrailCommandValidationError,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface ChangeTrailConfigurationInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly nextConfiguration: TrailConfiguration;
  readonly resolvedLabelIdsByEntityId?: Readonly<Record<string, readonly string[]>>;
  readonly resolvedStatusDefinitionIdsByEntityId?: Readonly<Record<string, string>>;
}

export interface CreateTrailStatusDefinitionInput {
  readonly category: TrailStatusCategory;
  readonly entityType: TrailStatusEntityType;
  readonly expectedConfiguration: TrailConfiguration;
  readonly name: string;
}

export interface RenameTrailStatusDefinitionInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly name: string;
  readonly statusDefinitionId: string;
}

export interface ReorderTrailStatusDefinitionsInput {
  readonly category: TrailStatusCategory;
  readonly definitionIds: readonly string[];
  readonly entityType: TrailStatusEntityType;
  readonly expectedConfiguration: TrailConfiguration;
}

export interface SetTrailStatusCategoryDefaultInput {
  readonly category: TrailStatusCategory;
  readonly entityType: TrailStatusEntityType;
  readonly expectedConfiguration: TrailConfiguration;
  readonly statusDefinitionId: string;
}

export interface DeleteTrailStatusDefinitionInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly newDefaultStatusDefinitionId?: string;
  readonly replacementStatusDefinitionId?: string;
  readonly statusDefinitionId: string;
}

export interface CreateTrailLabelGroupInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly name: string;
  readonly registeredEntityTypes: readonly TrailLabelEntityType[];
  readonly selectionMode: TrailLabelSelectionMode;
}

export interface EditTrailLabelGroupInput {
  readonly clearInvalidSelections?: boolean;
  readonly expectedConfiguration: TrailConfiguration;
  readonly groupId: string;
  readonly name: string;
  readonly registeredEntityTypes: readonly TrailLabelEntityType[];
  readonly selectionMode: TrailLabelSelectionMode;
}

export interface DeleteTrailLabelGroupInput {
  readonly clearInvalidSelections?: boolean;
  readonly expectedConfiguration: TrailConfiguration;
  readonly groupId: string;
}

export interface CreateTrailLabelInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly groupId: string;
  readonly name: string;
}

export interface EditTrailLabelInput {
  readonly clearInvalidSelections?: boolean;
  readonly expectedConfiguration: TrailConfiguration;
  readonly groupId: string;
  readonly labelId: string;
  readonly name: string;
}

export interface DeleteTrailLabelInput {
  readonly clearInvalidSelections?: boolean;
  readonly expectedConfiguration: TrailConfiguration;
  readonly labelId: string;
}

function normalizeName(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TrailCommandValidationError(`${label} must be non-empty text`);
  }
  return normalized;
}

function normalizeRegisteredEntityTypes(
  values: readonly TrailLabelEntityType[],
): readonly TrailLabelEntityType[] {
  if (new Set(values).size !== values.length) {
    throw new TrailCommandValidationError("LabelGroup entity types must not contain duplicates");
  }
  return TRAIL_LABEL_ENTITY_TYPES.filter((entityType) => values.includes(entityType));
}

function normalizeOrderedStatusDefinitionIds(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) => normalizeTrailCommandId(value, "StatusDefinition ID"));
  if (new Set(normalized).size !== normalized.length) {
    throw new TrailCommandValidationError("StatusDefinition order must not contain duplicate IDs");
  }
  return normalized;
}

function sortByStableId<T extends { readonly id: string }>(values: readonly T[]): readonly T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}

/** Matches the canonical plugin-data ordering used by authoritative save/reread. */
function canonicalizeLabelConfiguration(configuration: TrailConfiguration): TrailConfiguration {
  return {
    ...configuration,
    labelGroups: sortByStableId(configuration.labelGroups),
    labels: sortByStableId(configuration.labels),
  };
}

/**
 * Plugin-data persists StatusDefinitions nested by entity type/category and then
 * rebuilds the flat logical array in that same order during authoritative reread.
 */
function canonicalizeStatusConfiguration(configuration: TrailConfiguration): TrailConfiguration {
  const definitionsById = new Map(
    configuration.statusDefinitions.map((definition) => [definition.id, definition] as const),
  );
  const referenced = new Set<string>();
  const statusDefinitions: TrailStatusDefinition[] = [];

  for (const entityType of TRAIL_STATUS_ENTITY_TYPES) {
    for (const category of TRAIL_STATUS_CATEGORIES) {
      for (const definitionId of configuration.workflowStatuses[entityType][category].definitionIds) {
        const definition = definitionsById.get(definitionId);
        if (definition !== undefined) statusDefinitions.push(definition);
        referenced.add(definitionId);
      }
    }
  }

  // Preserve invalid/unregistered definitions for validation rather than silently
  // repairing them in this ordering helper.
  for (const definition of configuration.statusDefinitions) {
    if (!referenced.has(definition.id)) statusDefinitions.push(definition);
  }

  return { ...configuration, statusDefinitions };
}

function requireStatusDefinition(
  configuration: TrailConfiguration,
  statusDefinitionId: string,
): TrailStatusDefinition {
  const normalizedId = normalizeTrailCommandId(statusDefinitionId, "StatusDefinition ID");
  const definition = findTrailStatusDefinition(configuration, normalizedId);
  if (definition === undefined) {
    throw new TrailApplicationPlanningError(
      "status-definition-missing",
      `StatusDefinition does not exist: ${normalizedId}`,
    );
  }
  return definition;
}

function requireStatusDefinitionInCategory(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
  statusDefinitionId: string,
): TrailStatusDefinition {
  const definition = requireStatusDefinition(configuration, statusDefinitionId);
  const categoryConfiguration = configuration.workflowStatuses[entityType][category];
  if (
    definition.entityType !== entityType
    || definition.category !== category
    || !categoryConfiguration.definitionIds.includes(definition.id)
  ) {
    throw new TrailApplicationPlanningError(
      "status-definition-scope-invalid",
      `StatusDefinition ${definition.id} does not belong to ${entityType}.${category}`,
    );
  }
  return definition;
}

function replaceStatusCategoryConfiguration(
  configuration: TrailConfiguration,
  entityType: TrailStatusEntityType,
  category: TrailStatusCategory,
  categoryConfiguration: TrailConfiguration["workflowStatuses"][TrailStatusEntityType][TrailStatusCategory],
): TrailConfiguration {
  return {
    ...configuration,
    workflowStatuses: {
      ...configuration.workflowStatuses,
      [entityType]: {
        ...configuration.workflowStatuses[entityType],
        [category]: categoryConfiguration,
      },
    },
  };
}

function statusMutationNeedsInput(code: string, message: string): TrailMutationCommandResult {
  return { input: { code, message }, kind: "needs-input" };
}

function requireLabelGroup(
  configuration: TrailConfiguration,
  groupId: string,
): TrailLabelGroup {
  const normalizedId = normalizeTrailCommandId(groupId, "LabelGroup ID");
  const group = configuration.labelGroups.find(({ id }) => id === normalizedId);
  if (group === undefined) {
    throw new TrailApplicationPlanningError(
      "label-group-missing",
      `LabelGroup does not exist: ${normalizedId}`,
    );
  }
  return group;
}

function requireLabel(
  configuration: TrailConfiguration,
  labelId: string,
): TrailLabel {
  const normalizedId = normalizeTrailCommandId(labelId, "Label ID");
  const label = configuration.labels.find(({ id }) => id === normalizedId);
  if (label === undefined) {
    throw new TrailApplicationPlanningError(
      "label-missing",
      `Label does not exist: ${normalizedId}`,
    );
  }
  return label;
}

function clearInvalidLabelSelection(
  configuration: TrailConfiguration,
  entityType: TrailLabelEntityType,
  labelIds: readonly string[],
): readonly string[] {
  const labelsById = new Map(configuration.labels.map((label) => [label.id, label] as const));
  const groupsById = new Map(configuration.labelGroups.map((group) => [group.id, group] as const));
  let retained = labelIds.filter((labelId) => {
    const label = labelsById.get(labelId);
    if (label === undefined) return false;
    const group = groupsById.get(label.groupId);
    return group !== undefined && group.registeredEntityTypes.includes(entityType);
  });

  const selectedByGroup = new Map<string, string[]>();
  for (const labelId of retained) {
    const label = labelsById.get(labelId);
    if (label === undefined) continue;
    const selected = selectedByGroup.get(label.groupId) ?? [];
    selected.push(labelId);
    selectedByGroup.set(label.groupId, selected);
  }

  const conflictingGroups = new Set<string>();
  for (const [groupId, selected] of selectedByGroup) {
    if (groupsById.get(groupId)?.selectionMode === "single" && selected.length > 1) {
      conflictingGroups.add(groupId);
    }
  }
  if (conflictingGroups.size > 0) {
    retained = retained.filter((labelId) => {
      const groupId = labelsById.get(labelId)?.groupId;
      return groupId === undefined || !conflictingGroups.has(groupId);
    });
  }

  return [...retained].sort();
}

/** Thin Application boundary for validated Configuration replacement and reference repair. */
export class TrailConfigurationApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public change(input: ChangeTrailConfigurationInput): TrailMutationCommandResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailConfiguration(state, {
      commandId,
      expectedConfiguration: input.expectedConfiguration,
      nextConfiguration: input.nextConfiguration,
      resolvedLabelIdsByEntityId: input.resolvedLabelIdsByEntityId,
      resolvedStatusDefinitionIdsByEntityId: input.resolvedStatusDefinitionIdsByEntityId,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      return { input: planned.input, kind: "needs-input" };
    }
    if (
      planned.value.updatedEntities.length === 0
      && sameTrailConfiguration(input.expectedConfiguration, planned.value.configuration)
    ) {
      return { kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationMutationPlan(this.sourceSync, planned.value.plan),
    };
  }

  public createStatusDefinition(input: CreateTrailStatusDefinitionInput): TrailMutationCommandResult {
    const categoryConfiguration = input.expectedConfiguration.workflowStatuses[input.entityType][input.category];
    const definition: TrailStatusDefinition = {
      category: input.category,
      entityType: input.entityType,
      id: normalizeTrailCommandId(this.environment.createId(), "StatusDefinition ID"),
      name: normalizeName(input.name, "StatusDefinition name"),
    };
    const nextConfiguration = replaceStatusCategoryConfiguration(
      {
        ...input.expectedConfiguration,
        statusDefinitions: [...input.expectedConfiguration.statusDefinitions, definition],
      },
      input.entityType,
      input.category,
      {
        ...categoryConfiguration,
        definitionIds: [...categoryConfiguration.definitionIds, definition.id],
      },
    );
    return this.changeStatuses(input.expectedConfiguration, nextConfiguration);
  }

  public renameStatusDefinition(input: RenameTrailStatusDefinitionInput): TrailMutationCommandResult {
    const current = requireStatusDefinition(input.expectedConfiguration, input.statusDefinitionId);
    const nextConfiguration: TrailConfiguration = {
      ...input.expectedConfiguration,
      statusDefinitions: input.expectedConfiguration.statusDefinitions.map((definition) => (
        definition.id === current.id
          ? { ...definition, name: normalizeName(input.name, "StatusDefinition name") }
          : definition
      )),
    };
    return this.changeStatuses(input.expectedConfiguration, nextConfiguration);
  }

  public reorderStatusDefinitions(input: ReorderTrailStatusDefinitionsInput): TrailMutationCommandResult {
    const definitionIds = normalizeOrderedStatusDefinitionIds(input.definitionIds);
    const current = input.expectedConfiguration.workflowStatuses[input.entityType][input.category];
    if (
      definitionIds.length !== current.definitionIds.length
      || definitionIds.some((definitionId) => !current.definitionIds.includes(definitionId))
    ) {
      throw new TrailApplicationPlanningError(
        "status-order-invalid",
        `StatusDefinition order must be an exact permutation of ${input.entityType}.${input.category}`,
      );
    }
    const nextConfiguration = replaceStatusCategoryConfiguration(
      input.expectedConfiguration,
      input.entityType,
      input.category,
      { ...current, definitionIds },
    );
    return this.changeStatuses(input.expectedConfiguration, nextConfiguration);
  }

  public setStatusCategoryDefault(input: SetTrailStatusCategoryDefaultInput): TrailMutationCommandResult {
    const target = requireStatusDefinitionInCategory(
      input.expectedConfiguration,
      input.entityType,
      input.category,
      input.statusDefinitionId,
    );
    const current = input.expectedConfiguration.workflowStatuses[input.entityType][input.category];
    const nextConfiguration = replaceStatusCategoryConfiguration(
      input.expectedConfiguration,
      input.entityType,
      input.category,
      { ...current, defaultId: target.id },
    );
    return this.changeStatuses(input.expectedConfiguration, nextConfiguration);
  }

  public deleteStatusDefinition(input: DeleteTrailStatusDefinitionInput): TrailMutationCommandResult {
    const current = requireStatusDefinition(input.expectedConfiguration, input.statusDefinitionId);
    const currentCategory = input.expectedConfiguration
      .workflowStatuses[current.entityType][current.category];
    if (currentCategory.definitionIds.length === 1) {
      throw new TrailApplicationPlanningError(
        "status-category-last-definition",
        `Cannot delete the last StatusDefinition in ${current.entityType}.${current.category}`,
      );
    }

    const remainingIds = currentCategory.definitionIds.filter((id) => id !== current.id);
    const deletingDefault = currentCategory.defaultId === current.id;
    let nextDefaultId = currentCategory.defaultId;
    if (deletingDefault) {
      if (input.newDefaultStatusDefinitionId === undefined) {
        return statusMutationNeedsInput(
          "status-default-replacement-required",
          `Choose a new default StatusDefinition for ${current.entityType}.${current.category} before deleting ${current.name}`,
        );
      }
      const nextDefault = requireStatusDefinitionInCategory(
        input.expectedConfiguration,
        current.entityType,
        current.category,
        input.newDefaultStatusDefinitionId,
      );
      if (!remainingIds.includes(nextDefault.id)) {
        throw new TrailApplicationPlanningError(
          "status-default-replacement-invalid",
          "The deleted StatusDefinition cannot remain the category default",
        );
      }
      nextDefaultId = nextDefault.id;
    } else if (input.newDefaultStatusDefinitionId !== undefined) {
      throw new TrailApplicationPlanningError(
        "status-default-replacement-unexpected",
        "A new category default may only be supplied when deleting the current default",
      );
    }

    const state = readTrailPlanningState(this.runtimeStore);
    const affectedEntityIds: string[] = [];
    if (current.entityType === "project") {
      for (const project of state.domain.projectsById.values()) {
        if (project.statusDefinitionId === current.id) affectedEntityIds.push(project.id);
      }
    } else {
      for (const issue of state.domain.issuesById.values()) {
        if (issue.context === "workflow" && issue.statusDefinitionId === current.id) {
          affectedEntityIds.push(issue.id);
        }
      }
    }
    affectedEntityIds.sort();

    let resolvedStatusDefinitionIdsByEntityId: Readonly<Record<string, string>> | undefined;
    if (affectedEntityIds.length > 0) {
      if (input.replacementStatusDefinitionId === undefined) {
        return statusMutationNeedsInput(
          "status-reference-replacement-required",
          `Choose a replacement StatusDefinition for ${affectedEntityIds.length} current ${current.entityType} reference(s) before deleting ${current.name}`,
        );
      }
      const replacement = requireStatusDefinitionInCategory(
        input.expectedConfiguration,
        current.entityType,
        current.category,
        input.replacementStatusDefinitionId,
      );
      if (!remainingIds.includes(replacement.id)) {
        throw new TrailApplicationPlanningError(
          "status-reference-replacement-invalid",
          "Existing references cannot be moved to the StatusDefinition being deleted",
        );
      }
      resolvedStatusDefinitionIdsByEntityId = Object.fromEntries(
        affectedEntityIds.map((entityId) => [entityId, replacement.id] as const),
      );
    } else if (input.replacementStatusDefinitionId !== undefined) {
      throw new TrailApplicationPlanningError(
        "status-reference-replacement-unexpected",
        "A reference replacement may only be supplied when current entities use this StatusDefinition",
      );
    }

    const nextConfiguration = replaceStatusCategoryConfiguration(
      {
        ...input.expectedConfiguration,
        statusDefinitions: input.expectedConfiguration.statusDefinitions.filter(
          ({ id }) => id !== current.id,
        ),
      },
      current.entityType,
      current.category,
      { defaultId: nextDefaultId, definitionIds: remainingIds },
    );
    return this.changeStatuses(
      input.expectedConfiguration,
      nextConfiguration,
      resolvedStatusDefinitionIdsByEntityId,
    );
  }

  public createLabelGroup(input: CreateTrailLabelGroupInput): TrailMutationCommandResult {
    const group: TrailLabelGroup = {
      id: normalizeTrailCommandId(this.environment.createId(), "LabelGroup ID"),
      name: normalizeName(input.name, "LabelGroup name"),
      registeredEntityTypes: normalizeRegisteredEntityTypes(input.registeredEntityTypes),
      selectionMode: input.selectionMode,
    };
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labelGroups: [...input.expectedConfiguration.labelGroups, group],
      },
      false,
    );
  }

  public editLabelGroup(input: EditTrailLabelGroupInput): TrailMutationCommandResult {
    const current = requireLabelGroup(input.expectedConfiguration, input.groupId);
    const nextGroup: TrailLabelGroup = {
      ...current,
      name: normalizeName(input.name, "LabelGroup name"),
      registeredEntityTypes: normalizeRegisteredEntityTypes(input.registeredEntityTypes),
      selectionMode: input.selectionMode,
    };
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labelGroups: input.expectedConfiguration.labelGroups.map((group) => (
          group.id === current.id ? nextGroup : group
        )),
      },
      input.clearInvalidSelections === true,
    );
  }

  public deleteLabelGroup(input: DeleteTrailLabelGroupInput): TrailMutationCommandResult {
    const current = requireLabelGroup(input.expectedConfiguration, input.groupId);
    const removedLabelIds = new Set(
      input.expectedConfiguration.labels
        .filter(({ groupId }) => groupId === current.id)
        .map(({ id }) => id),
    );
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labelGroups: input.expectedConfiguration.labelGroups.filter(({ id }) => id !== current.id),
        labels: input.expectedConfiguration.labels.filter(({ id }) => !removedLabelIds.has(id)),
      },
      input.clearInvalidSelections === true,
    );
  }

  public createLabel(input: CreateTrailLabelInput): TrailMutationCommandResult {
    const group = requireLabelGroup(input.expectedConfiguration, input.groupId);
    const label: TrailLabel = {
      groupId: group.id,
      id: normalizeTrailCommandId(this.environment.createId(), "Label ID"),
      name: normalizeName(input.name, "Label name"),
    };
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labels: [...input.expectedConfiguration.labels, label],
      },
      false,
    );
  }

  public editLabel(input: EditTrailLabelInput): TrailMutationCommandResult {
    const current = requireLabel(input.expectedConfiguration, input.labelId);
    const targetGroup = requireLabelGroup(input.expectedConfiguration, input.groupId);
    const nextLabel: TrailLabel = {
      ...current,
      groupId: targetGroup.id,
      name: normalizeName(input.name, "Label name"),
    };
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labels: input.expectedConfiguration.labels.map((label) => (
          label.id === current.id ? nextLabel : label
        )),
      },
      input.clearInvalidSelections === true,
    );
  }

  public deleteLabel(input: DeleteTrailLabelInput): TrailMutationCommandResult {
    const current = requireLabel(input.expectedConfiguration, input.labelId);
    return this.changeLabels(
      input.expectedConfiguration,
      {
        ...input.expectedConfiguration,
        labels: input.expectedConfiguration.labels.filter(({ id }) => id !== current.id),
      },
      input.clearInvalidSelections === true,
    );
  }

  private changeStatuses(
    expectedConfiguration: TrailConfiguration,
    nextConfiguration: TrailConfiguration,
    resolvedStatusDefinitionIdsByEntityId?: Readonly<Record<string, string>>,
  ): TrailMutationCommandResult {
    return this.change({
      expectedConfiguration,
      nextConfiguration: canonicalizeStatusConfiguration(nextConfiguration),
      resolvedStatusDefinitionIdsByEntityId,
    });
  }

  private changeLabels(
    expectedConfiguration: TrailConfiguration,
    nextConfiguration: TrailConfiguration,
    clearInvalidSelections: boolean,
  ): TrailMutationCommandResult {
    const canonicalNextConfiguration = canonicalizeLabelConfiguration(nextConfiguration);
    if (!clearInvalidSelections) {
      return this.change({
        expectedConfiguration,
        nextConfiguration: canonicalNextConfiguration,
      });
    }

    const state = readTrailPlanningState(this.runtimeStore);
    const resolvedLabelIdsByEntityId: Record<string, readonly string[]> = {};
    const addResolution = (
      entityType: TrailLabelEntityType,
      entityId: string,
      labelIds: readonly string[],
    ) => {
      if (
        findTrailLabelSelectionViolations(
          canonicalNextConfiguration,
          entityType,
          labelIds,
        ).length === 0
      ) {
        return;
      }
      resolvedLabelIdsByEntityId[entityId] = clearInvalidLabelSelection(
        canonicalNextConfiguration,
        entityType,
        labelIds,
      );
    };

    for (const initiative of state.domain.initiativesById.values()) {
      addResolution("initiative", initiative.id, initiative.labelIds);
    }
    for (const project of state.domain.projectsById.values()) {
      addResolution("project", project.id, project.labelIds);
    }
    for (const issue of state.domain.issuesById.values()) {
      addResolution("issue", issue.id, issue.labelIds);
    }

    return this.change({
      expectedConfiguration,
      nextConfiguration: canonicalNextConfiguration,
      resolvedLabelIdsByEntityId,
    });
  }
}
