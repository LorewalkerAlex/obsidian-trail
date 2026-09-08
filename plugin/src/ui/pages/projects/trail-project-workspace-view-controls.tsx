import { useMemo } from "react";

import type { TrailConfiguration, TrailStatusDefinition } from "../../../domain/model/trail-configuration";
import { TRAIL_STATUS_CATEGORIES } from "../../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../../domain/rules/trail-status-rules";
import type {
  TrailProjectWorkspaceFilterPropertyId,
  TrailProjectWorkspaceFilterState,
  TrailProjectWorkspaceNamedTargetReadModel,
} from "../../../query/projects/trail-project-workspace-query";
import type {
  TrailDueFilterValue,
  TrailFilterDiscreteValue,
} from "../../../query/shared/trail-collection-filter";
import {
  getTrailEstimatePresentation,
  TRAIL_ESTIMATE_PRESENTATION_VALUES,
} from "../../entities/trail-estimate";
import {
  getTrailPriorityPresentation,
  TRAIL_PRIORITY_PRESENTATION_VALUES,
} from "../../entities/trail-priority";
import {
  TrailCollectionFilter,
  type TrailCollectionFilterProperty,
} from "../../interactions/trail-collection-filter";
import { TrailViewBar } from "../../patterns/trail-view-bar";

function statusOptions(configuration: TrailConfiguration) {
  return TRAIL_STATUS_CATEGORIES.flatMap((category) => (
    configuration.workflowStatuses.issue[category].definitionIds
      .map((definitionId) => resolveTrailStatusDefinition(
        configuration,
        "issue",
        definitionId,
      ))
      .filter((definition): definition is TrailStatusDefinition => definition !== undefined)
      .map((definition) => ({
        label: definition.name,
        value: { kind: "value" as const, value: definition.id },
      }))
  ));
}

function priorityOptions() {
  return TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => ({
    label: getTrailPriorityPresentation(priority).label,
    value: priority === undefined
      ? { kind: "none" as const }
      : { kind: "value" as const, value: priority },
  }));
}

function milestoneOptions(
  milestones: readonly TrailProjectWorkspaceNamedTargetReadModel[],
) {
  return [
    { label: "No milestone", value: { kind: "none" as const } },
    ...milestones.map((milestone) => ({
      label: milestone.title,
      value: { kind: "value" as const, value: milestone.id },
    })),
  ];
}

function labelOptions(configuration: TrailConfiguration) {
  const groupsById = new Map(configuration.labelGroups.map((group) => [group.id, group] as const));
  return [
    { label: "No labels", value: { kind: "none" as const } },
    ...configuration.labels
      .filter((label) => groupsById.get(label.groupId)?.registeredEntityTypes.includes("issue") === true)
      .map((label) => ({
        group: groupsById.get(label.groupId)?.name,
        label: label.name,
        value: { kind: "value" as const, value: label.id },
      }))
      .sort((left, right) => {
        const groupOrder = (left.group ?? "").localeCompare(right.group ?? "");
        if (groupOrder !== 0) return groupOrder;
        const labelOrder = left.label.localeCompare(right.label);
        return labelOrder !== 0 ? labelOrder : left.value.value.localeCompare(right.value.value);
      }),
  ];
}

function estimateOptions() {
  return TRAIL_ESTIMATE_PRESENTATION_VALUES.map((estimate) => {
    const presentation = getTrailEstimatePresentation(estimate);
    return {
      label: estimate === undefined
        ? presentation.label
        : `${presentation.shortLabel} · ${presentation.label}`,
      value: estimate === undefined
        ? { kind: "none" as const }
        : { kind: "value" as const, value: estimate },
    };
  });
}

function projectWorkspaceFilterProperties(
  configuration: TrailConfiguration,
  milestones: readonly TrailProjectWorkspaceNamedTargetReadModel[],
): readonly TrailCollectionFilterProperty<TrailProjectWorkspaceFilterPropertyId>[] {
  return [
    {
      id: "status",
      kind: "discrete",
      label: "Status",
      options: statusOptions(configuration),
    },
    {
      id: "priority",
      kind: "discrete",
      label: "Priority",
      options: priorityOptions(),
    },
    {
      id: "milestone",
      kind: "discrete",
      label: "Milestone",
      options: milestoneOptions(milestones),
      searchable: true,
    },
    {
      id: "labels",
      kind: "discrete",
      label: "Labels",
      options: labelOptions(configuration),
      searchable: true,
    },
    { id: "due", kind: "due", label: "Due" },
    {
      id: "estimate",
      kind: "discrete",
      label: "Estimate",
      options: estimateOptions(),
    },
  ];
}

export function TrailProjectWorkspaceViewControls({
  configuration,
  filter,
  milestones,
  onClearAllFilters,
  onClearFilterClause,
  onSetDueFilter,
  onToggleDiscreteFilter,
}: {
  readonly configuration: TrailConfiguration;
  readonly filter: TrailProjectWorkspaceFilterState;
  readonly milestones: readonly TrailProjectWorkspaceNamedTargetReadModel[];
  readonly onClearAllFilters: () => void;
  readonly onClearFilterClause: (propertyId: TrailProjectWorkspaceFilterPropertyId) => void;
  readonly onSetDueFilter: (
    propertyId: TrailProjectWorkspaceFilterPropertyId,
    value: TrailDueFilterValue,
  ) => void;
  readonly onToggleDiscreteFilter: (
    propertyId: TrailProjectWorkspaceFilterPropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
}) {
  const properties = useMemo(
    () => projectWorkspaceFilterProperties(configuration, milestones),
    [configuration, milestones],
  );

  return (
    <TrailViewBar
      label="Project issue view controls"
      leading={(
        <TrailCollectionFilter
          onClearAll={onClearAllFilters}
          onClearClause={onClearFilterClause}
          onSetDueValue={onSetDueFilter}
          onToggleDiscreteValue={onToggleDiscreteFilter}
          properties={properties}
          state={filter}
        />
      )}
    />
  );
}
