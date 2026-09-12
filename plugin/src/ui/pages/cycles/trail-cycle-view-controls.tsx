import { useMemo } from "react";

import type { TrailConfiguration, TrailStatusDefinition } from "../../../domain/model/trail-configuration";
import { TRAIL_STATUS_CATEGORIES } from "../../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../../domain/rules/trail-status-rules";
import type {
  TrailCycleFilterPropertyId,
  TrailCycleFilterState,
  TrailCycleNamedTargetReadModel,
  TrailCycleProjectReadModel,
} from "../../../query/cycles/trail-cycle-page-query";
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
import {
  TrailViewBar,
  TrailViewLayoutSwitch,
} from "../../patterns/trail-view-bar";

export type TrailCycleLayout = "board" | "list";

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

function projectOptions(projects: readonly TrailCycleProjectReadModel[]) {
  return projects.map((project) => ({
    label: project.title,
    value: { kind: "value" as const, value: project.id },
  }));
}

function priorityOptions() {
  return TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => ({
    label: getTrailPriorityPresentation(priority).label,
    value: priority === undefined
      ? { kind: "none" as const }
      : { kind: "value" as const, value: priority },
  }));
}

function milestoneOptions(milestones: readonly TrailCycleNamedTargetReadModel[]) {
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

function cycleFilterProperties(
  configuration: TrailConfiguration,
  milestones: readonly TrailCycleNamedTargetReadModel[],
  projects: readonly TrailCycleProjectReadModel[],
): readonly TrailCollectionFilterProperty<TrailCycleFilterPropertyId>[] {
  return [
    {
      id: "status",
      kind: "discrete",
      label: "Status",
      options: statusOptions(configuration),
    },
    {
      id: "project",
      kind: "discrete",
      label: "Project",
      options: projectOptions(projects),
      searchable: true,
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

function TrailListLayoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 16 16">
      <path d="M3 4.5h10M3 8h10M3 11.5h10" />
    </svg>
  );
}

function TrailBoardLayoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" viewBox="0 0 16 16">
      <rect height="9" rx="1" width="3" x="2.25" y="3.5" />
      <rect height="9" rx="1" width="3" x="6.5" y="3.5" />
      <rect height="9" rx="1" width="3" x="10.75" y="3.5" />
    </svg>
  );
}

export function TrailCycleViewControls({
  boardAvailable,
  configuration,
  filter,
  layout,
  milestones,
  onClearAllFilters,
  onClearFilterClause,
  onLayoutChange,
  onSetDueFilter,
  onToggleDiscreteFilter,
  projects,
}: {
  readonly boardAvailable: boolean;
  readonly configuration: TrailConfiguration;
  readonly filter: TrailCycleFilterState;
  readonly layout: TrailCycleLayout;
  readonly milestones: readonly TrailCycleNamedTargetReadModel[];
  readonly onClearAllFilters: () => void;
  readonly onClearFilterClause: (propertyId: TrailCycleFilterPropertyId) => void;
  readonly onLayoutChange: (layout: TrailCycleLayout) => void;
  readonly onSetDueFilter: (
    propertyId: TrailCycleFilterPropertyId,
    value: TrailDueFilterValue,
  ) => void;
  readonly onToggleDiscreteFilter: (
    propertyId: TrailCycleFilterPropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
  readonly projects: readonly TrailCycleProjectReadModel[];
}) {
  const properties = useMemo(
    () => cycleFilterProperties(configuration, milestones, projects),
    [configuration, milestones, projects],
  );

  return (
    <TrailViewBar
      label="Cycle issue view controls"
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
      trailing={boardAvailable ? (
        <TrailViewLayoutSwitch
          label="Cycle issue layout"
          onValueChange={onLayoutChange}
          options={[
            { icon: <TrailListLayoutIcon />, label: "List", value: "list" },
            { icon: <TrailBoardLayoutIcon />, label: "Board", value: "board" },
          ]}
          value={layout}
        />
      ) : undefined}
    />
  );
}
