import { useState } from "react";

import type { TrailStatusDefinition } from "../../domain/model/trail-configuration";
import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
  TrailStatusEntityType,
} from "../../domain/model/trail-values";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";
import { TrailStatusGlyph } from "./trail-status";

export interface TrailStatusPropertyOptionGroup {
  readonly category: TrailProjectStatusCategory | TrailStatusCategory;
  readonly definitions: readonly TrailStatusDefinition[];
}

export interface TrailStatusPropertySelectProps {
  readonly category: TrailProjectStatusCategory | TrailStatusCategory;
  readonly disabled?: boolean;
  readonly entityType: TrailStatusEntityType;
  readonly label: string;
  readonly onValueChange: (statusDefinitionId: string) => void;
  readonly options: readonly TrailStatusPropertyOptionGroup[];
  readonly value: string;
}

function StatusGlyph({
  category,
  entityType,
}: {
  readonly category: TrailProjectStatusCategory | TrailStatusCategory;
  readonly entityType: TrailStatusEntityType;
}) {
  return entityType === "project" ? (
    <TrailStatusGlyph
      category={category as TrailProjectStatusCategory}
      decorative
      entityType="project"
    />
  ) : (
    <TrailStatusGlyph category={category} decorative />
  );
}

/** Shared Status property picker over Query-supplied configured Status options. */
export function TrailStatusPropertySelect({
  category,
  disabled = false,
  entityType,
  label,
  onValueChange,
  options,
  value,
}: TrailStatusPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const choose = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label="Status"
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Status: ${label}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          <StatusGlyph category={category} entityType={entityType} />
          <span className="trail-property-control__summary">{label}</span>
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Status</div>
        {options.map((group) => group.definitions.map((definition) => (
          <button
            className="trail-view-popover__item"
            key={definition.id}
            onClick={() => choose(definition.id)}
            type="button"
          >
            <span className="trail-status-property-select__option">
              <StatusGlyph category={group.category} entityType={entityType} />
              <span>{definition.name}</span>
            </span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible={definition.id === value ? "true" : "false"}
            >
              ✓
            </span>
          </button>
        )))}
      </div>
    </TrailViewPopover>
  );
}
