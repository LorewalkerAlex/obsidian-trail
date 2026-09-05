import { Popover } from "radix-ui";
import {
  Fragment,
  useMemo,
  useState,
} from "react";

import type {
  TrailLabel,
  TrailLabelGroup,
} from "../../domain/model/trail-configuration";
import type { TrailLabelEntityType } from "../../domain/model/trail-values";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailLabelDots } from "./trail-label";

function labelSummary(labels: readonly TrailLabel[]): string {
  if (labels.length === 0) return "No labels";
  if (labels.length <= 2) return labels.map(({ name }) => name).join(", ");
  return `${labels.slice(0, 2).map(({ name }) => name).join(", ")} +${labels.length - 2}`;
}

function selectedLabels(
  labels: readonly TrailLabel[],
  selectedLabelIds: readonly string[],
): readonly TrailLabel[] {
  const selected = new Set(selectedLabelIds);
  return labels
    .filter(({ id }) => selected.has(id))
    .sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name);
      return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
    });
}

export function nextTrailLabelSelection(input: {
  readonly group: TrailLabelGroup;
  readonly labels: readonly TrailLabel[];
  readonly selectedLabelIds: readonly string[];
  readonly toggledLabelId: string;
}): readonly string[] {
  const selected = new Set(input.selectedLabelIds);
  if (selected.has(input.toggledLabelId)) {
    selected.delete(input.toggledLabelId);
    return [...selected];
  }

  if (input.group.selectionMode === "single") {
    for (const label of input.labels) {
      if (label.groupId === input.group.id) selected.delete(label.id);
    }
  }
  selected.add(input.toggledLabelId);
  return [...selected];
}

export interface TrailLabelPropertySelectProps {
  readonly disabled?: boolean;
  readonly entityType?: TrailLabelEntityType;
  readonly groups: readonly TrailLabelGroup[];
  readonly labels: readonly TrailLabel[];
  readonly layer?: "menu" | "modal-child";
  readonly onValueChange: (labelIds: readonly string[]) => void;
  readonly value: readonly string[];
}

export function TrailLabelPropertySelect({
  disabled = false,
  entityType = "issue",
  groups,
  labels,
  layer = "menu",
  onValueChange,
  value,
}: TrailLabelPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const applicableGroups = useMemo(() => groups
    .filter(({ registeredEntityTypes }) => registeredEntityTypes.includes(entityType))
    .sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name);
      return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
    }), [entityType, groups]);
  const applicableGroupIds = useMemo(
    () => new Set(applicableGroups.map(({ id }) => id)),
    [applicableGroups],
  );
  const applicableLabels = useMemo(
    () => labels.filter(({ groupId }) => applicableGroupIds.has(groupId)),
    [applicableGroupIds, labels],
  );
  const selected = useMemo(
    () => selectedLabels(applicableLabels, value),
    [applicableLabels, value],
  );
  const selectedIds = useMemo(() => new Set(value), [value]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleGroups = applicableGroups.map((group) => ({
    group,
    labels: applicableLabels
      .filter((label) => (
        label.groupId === group.id
        && (normalizedSearch === ""
          || label.name.toLocaleLowerCase().includes(normalizedSearch)
          || group.name.toLocaleLowerCase().includes(normalizedSearch))
      ))
      .sort((left, right) => {
        const nameOrder = left.name.localeCompare(right.name);
        return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
      }),
  })).filter(({ labels: groupLabels }) => groupLabels.length > 0);
  const summary = labelSummary(selected);

  return (
    <Popover.Root
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      open={open}
    >
      <Popover.Trigger asChild>
        <TrailPropertyControl
          aria-label={`Labels: ${summary}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          {selected.length === 0 ? null : <TrailLabelDots labels={selected} />}
          <span className="trail-label-property-select__summary">{summary}</span>
        </TrailPropertyControl>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          aria-label="Labels"
          className="trail-label-select"
          data-trail-transient-layer={layer}
          collisionPadding={8}
          sideOffset={4}
        >
          <input
            aria-label="Search labels"
            autoFocus
            className="trail-label-select__search"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search labels"
            type="search"
            value={search}
          />
          <div className="trail-label-select__options">
            {visibleGroups.map(({ group, labels: groupLabels }) => (
              <Fragment key={group.id}>
                <div className="trail-label-select__group">{group.name}</div>
                {groupLabels.map((label) => {
                  const isSelected = selectedIds.has(label.id);
                  return (
                    <button
                      aria-pressed={isSelected}
                      className="trail-label-select__item"
                      key={label.id}
                      onClick={() => onValueChange(nextTrailLabelSelection({
                        group,
                        labels: applicableLabels,
                        selectedLabelIds: value,
                        toggledLabelId: label.id,
                      }))}
                      type="button"
                    >
                      <TrailLabelDots labels={[label]} />
                      <span className="trail-label-select__name">{label.name}</span>
                      <svg
                        aria-hidden="true"
                        className="trail-label-select__check"
                        data-visible={isSelected ? "true" : "false"}
                        viewBox="0 0 16 16"
                      >
                        <path d="M3.5 8.25 6.5 11l6-6" />
                      </svg>
                    </button>
                  );
                })}
              </Fragment>
            ))}
            {visibleGroups.length === 0 ? (
              <div className="trail-label-select__empty">No labels found.</div>
            ) : null}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
