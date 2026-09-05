import { useMemo, useState } from "react";

import type { TrailConfiguration } from "../../../domain/model/trail-configuration";
import {
  type TrailTriageFilterPropertyId,
  type TrailTriageFilterState,
  type TrailTriageOrdering,
} from "../../../query/triage/trail-triage-query";
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
import { TrailViewBar, TrailViewBarAction } from "../../patterns/trail-view-bar";
import { TrailViewPopover } from "../../patterns/trail-view-popover";

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

function filterProperties(
  configuration: TrailConfiguration,
): readonly TrailCollectionFilterProperty<TrailTriageFilterPropertyId>[] {
  return [
    { id: "due", kind: "due", label: "Due" },
    {
      id: "priority",
      kind: "discrete",
      label: "Priority",
      options: priorityOptions(),
    },
    {
      id: "labels",
      kind: "discrete",
      label: "Labels",
      options: labelOptions(configuration),
      searchable: true,
    },
  ];
}

function TrailTriageOrder({
  onValueChange,
  value,
}: {
  readonly onValueChange: (value: TrailTriageOrdering) => void;
  readonly value: TrailTriageOrdering;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Review due", value: "review-due" },
    { label: "Priority", value: "priority" },
  ] as const satisfies readonly { readonly label: string; readonly value: TrailTriageOrdering }[];
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "Review due";

  return (
    <TrailViewPopover
      align="end"
      label="Triage order"
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailViewBarAction label={`Order: ${selectedLabel}`} />
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Order by</div>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              aria-pressed={selected}
              className="trail-view-popover__item"
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              <span>{option.label}</span>
              <span
                aria-hidden="true"
                className="trail-view-popover__check"
                data-visible={selected ? "true" : "false"}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </TrailViewPopover>
  );
}

export function TrailTriageViewControls({
  configuration,
  filter,
  onClearAllFilters,
  onClearFilterClause,
  onOrderingChange,
  onSetDueFilter,
  onToggleDiscreteFilter,
  ordering,
}: {
  readonly configuration: TrailConfiguration;
  readonly filter: TrailTriageFilterState;
  readonly onClearAllFilters: () => void;
  readonly onClearFilterClause: (propertyId: TrailTriageFilterPropertyId) => void;
  readonly onOrderingChange: (value: TrailTriageOrdering) => void;
  readonly onSetDueFilter: (
    propertyId: TrailTriageFilterPropertyId,
    value: TrailDueFilterValue,
  ) => void;
  readonly onToggleDiscreteFilter: (
    propertyId: TrailTriageFilterPropertyId,
    value: TrailFilterDiscreteValue,
  ) => void;
  readonly ordering: TrailTriageOrdering;
}) {
  const properties = useMemo(() => filterProperties(configuration), [configuration]);

  return (
    <TrailViewBar
      label="Triage view controls"
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
        <TrailTriageOrder onValueChange={onOrderingChange} value={ordering} />
      )}
    />
  );
}
