import type {
  TrailConfiguration,
  TrailLabel,
  TrailLabelGroup,
} from "../../domain/model/trail-configuration";
import {
  TRAIL_LABEL_ENTITY_TYPES,
  type TrailLabelEntityType,
  type TrailLabelSelectionMode,
} from "../../domain/model/trail-values";
import { planChangeTrailConfiguration } from "../../domain/planning/trail-configuration-planning";
import { sameTrailConfiguration } from "../../domain/rules/trail-domain-equality";
import { findTrailLabelSelectionViolations } from "../../domain/rules/trail-label-rules";
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
