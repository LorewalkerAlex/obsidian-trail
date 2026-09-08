import { useState } from "react";

import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";

export interface TrailRelationPropertyOption {
  readonly id: string;
  readonly title: string;
}

export interface TrailRelationPropertySelectProps {
  readonly disabled?: boolean;
  readonly label: string;
  readonly noneLabel: string;
  readonly onValueChange: (value: string | undefined) => void;
  readonly options: readonly TrailRelationPropertyOption[];
  readonly value: string | undefined;
}

/** Shared optional named-relation property picker; target legality stays with Query/Application. */
export function TrailRelationPropertySelect({
  disabled = false,
  label,
  noneLabel,
  onValueChange,
  options,
  value,
}: TrailRelationPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const summary = selected?.title ?? noneLabel;

  const choose = (nextValue: string | undefined) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label={label}
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`${label}: ${summary}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          <span className="trail-property-control__summary">{summary}</span>
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">{label}</div>
        <button
          className="trail-view-popover__item"
          onClick={() => choose(undefined)}
          type="button"
        >
          <span>{noneLabel}</span>
          <span
            aria-hidden="true"
            className="trail-view-popover__check"
            data-visible={value === undefined ? "true" : "false"}
          >
            ✓
          </span>
        </button>
        {options.map((option) => (
          <button
            className="trail-view-popover__item"
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <span>{option.title}</span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible={option.id === value ? "true" : "false"}
            >
              ✓
            </span>
          </button>
        ))}
      </div>
    </TrailViewPopover>
  );
}
