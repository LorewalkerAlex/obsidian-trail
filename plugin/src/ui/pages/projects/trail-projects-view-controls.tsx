import { useMemo } from "react";

import type { TrailConfiguration, TrailStatusDefinition } from "../../../domain/model/trail-configuration";
import { TRAIL_PROJECT_STATUS_CATEGORIES } from "../../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../../domain/rules/trail-status-rules";
import type {
  TrailInitiativeFocusFilterPropertyId,
  TrailInitiativeFocusFilterState,
} from "../../../query/projects/trail-initiative-focus-query";
import type {
  TrailProjectsRootFilterPropertyId,
  TrailProjectsRootFilterState,
} from "../../../query/projects/trail-projects-root-query";
import type {
  TrailDueFilterValue,
  TrailFilterDiscreteValue,
} from "../../../query/shared/trail-collection-filter";
import {
  TRAIL_PRIORITY_PRESENTATION_VALUES,
  getTrailPriorityPresentation,
} from "../../entities/trail-priority";
import {
  TrailCollectionFilter,
  type TrailCollectionFilterProperty,
} from "../../interactions/trail-collection-filter";
import {
  TrailViewBar,
  TrailViewLayoutSwitch,
} from "../../patterns/trail-view-bar";

export type TrailProjectsRootLayout = "list" | "timeline";

function priorityOptions() {
  return TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => ({
    label: getTrailPriorityPresentation(priority).label,
    value: priority === undefined
      ? { kind: "none" as const }
      : { kind: "value" as const, value: priority },
  }));
}

function labelOptions(configuration: TrailConfiguration) {
  const groupsById = new Map(configuration.labelGroups.map((group) => [group.id, group] as const));
  return [
    { label: "No labels", value: { kind: "none" as const } },
    ...configuration.labels
      .filter((label) => groupsById.get(label.groupId)?.registeredEntityTypes.includes("project") === true)
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

function statusOptions(configuration: TrailConfiguration) {
  return TRAIL_PROJECT_STATUS_CATEGORIES.flatMap((category) => (
    configuration.workflowStatuses.project[category].definitionIds
      .map((definitionId) => resolveTrailStatusDefinition(
        configuration,
        "project",
        definitionId,
      ))
      .filter((definition): definition is TrailStatusDefinition => definition !== undefined)
      .map((definition) => ({
        label: definition.name,
        value: { kind: "value" as const, value: definition.id },
      }))
  ));
}

function initiativeOptions(
  initiatives: readonly { readonly id: string; readonly title: string }[],
) {
  return [
    { label: "No Initiative", value: { kind: "none" as const } },
    ...initiatives.map((initiative) => ({
      label: initiative.title,
      value: { kind: "value" as const, value: initiative.id },
    })),
  ];
}

function statusFilterProperty(
  configuration: TrailConfiguration,
): TrailCollectionFilterProperty<"status"> {
  return {
    id: "status",
    kind: "discrete",
    label: "Status",
    options: statusOptions(configuration),
  };
}

function priorityFilterProperty(): TrailCollectionFilterProperty<"priority"> {
  return {
    id: "priority",
    kind: "discrete",
    label: "Priority",
    options: priorityOptions(),
  };
}

function labelsFilterProperty(
  configuration: TrailConfiguration,
): TrailCollectionFilterProperty<"labels"> {
  return {
    id: "labels",
    kind: "discrete",
    label: "Labels",
    options: labelOptions(configuration),
    searchable: true,
  };
}

function dueFilterProperty(): TrailCollectionFilterProperty<"due"> {
  return { id: "due", kind: "due", label: "Due" };
}

function initiativeFilterProperty(
  initiatives: readonly { readonly id: string; readonly title: string }[],
): TrailCollectionFilterProperty<"initiative"> {
  return {
    id: "initiative",
    kind: "discrete",
    label: "Initiative",
    options: initiativeOptions(initiatives),
    searchable: true,
  };
}

function projectsRootFilterProperties(
  configuration: TrailConfiguration,
  initiatives: readonly { readonly id: string; readonly title: string }[],
): readonly TrailCollectionFilterProperty<TrailProjectsRootFilterPropertyId>[] {
  return [
    statusFilterProperty(configuration),
    initiativeFilterProperty(initiatives),
    priorityFilterProperty(),
    labelsFilterProperty(configuration),
    dueFilterProperty(),
  ];
}

function initiativeFocusFilterProperties(
  configuration: TrailConfiguration,
): readonly TrailCollectionFilterProperty<TrailInitiativeFocusFilterPropertyId>[] {
  return [
    statusFilterProperty(configuration),
    priorityFilterProperty(),
    labelsFilterProperty(configuration),
    dueFilterProperty(),
  ];
}

function TrailListLayoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 16 16">
      <path d="M3 4.5h10M3 8h10M3 11.5h10" />
    </svg>
  );
}

function TrailTimelineLayoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 16 16">
      <path d="M3 4.25v7.5M6 6h6M6 10h4" />
    </svg>
  );
}

export function TrailProjectsViewControls({
  configuration,
  filter,
  initiatives,
  layout,
  onClearAllFilters,
  onClearFilterClause,
  onLayoutChange,
  onSetDueFilter,
  onToggleDiscreteFilter,
}: {
  readonly configuration: TrailConfiguration;
  readonly filter: TrailProjectsRootFilterState;
  readonly initiatives: readonly { readonly id: string; readonly title: string }[];
  readonly layout: TrailProjectsRootLayout;
  readonly onClearAllFilters: () => void;
  readonly onClearFilterClause: (propertyId: TrailProjectsRootFilterPropertyId) => void;
  readonly onLayoutChange: (layout: TrailProjectsRootLayout) => void;
  readonly onSetDueFilter: (
    propertyId: TrailProjectsRootFilterPropertyId,
    value: TrailDueFilterValue,
  ) => void;
  readonly onToggleDiscreteFilter: (
    propertyId: TrailProjectsRootFilterPropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
}) {
  const properties = useMemo(
    () => projectsRootFilterProperties(configuration, initiatives),
    [configuration, initiatives],
  );

  return (
    <TrailViewBar
      label="Projects view controls"
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
      trailing={(
        <TrailViewLayoutSwitch
          label="Projects layout"
          onValueChange={onLayoutChange}
          options={[
            { icon: <TrailListLayoutIcon />, label: "List", value: "list" },
            { icon: <TrailTimelineLayoutIcon />, label: "Timeline", value: "timeline" },
          ]}
          value={layout}
        />
      )}
    />
  );
}

export function TrailInitiativeViewControls({
  configuration,
  filter,
  onClearAllFilters,
  onClearFilterClause,
  onSetDueFilter,
  onToggleDiscreteFilter,
}: {
  readonly configuration: TrailConfiguration;
  readonly filter: TrailInitiativeFocusFilterState;
  readonly onClearAllFilters: () => void;
  readonly onClearFilterClause: (propertyId: TrailInitiativeFocusFilterPropertyId) => void;
  readonly onSetDueFilter: (
    propertyId: TrailInitiativeFocusFilterPropertyId,
    value: TrailDueFilterValue,
  ) => void;
  readonly onToggleDiscreteFilter: (
    propertyId: TrailInitiativeFocusFilterPropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
}) {
  const properties = useMemo(
    () => initiativeFocusFilterProperties(configuration),
    [configuration],
  );

  return (
    <TrailViewBar
      label="Initiative project view controls"
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
