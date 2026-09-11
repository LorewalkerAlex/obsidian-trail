import { useMemo, useState } from "react";

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
  readonly required?: boolean;
  readonly searchable?: boolean;
  readonly value: string | undefined;
}

/** Shared named-relation property picker; target legality stays with Query/Application. */
export function TrailRelationPropertySelect({
  disabled = false,
  label,
  noneLabel,
  onValueChange,
  options,
  required = false,
  searchable = false,
  value,
}: TrailRelationPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.id === value);
  const summary = selected?.title ?? noneLabel;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleOptions = useMemo(() => (
    normalizedSearch === ""
      ? options
      : options.filter(({ title }) => title.toLocaleLowerCase().includes(normalizedSearch))
  ), [normalizedSearch, options]);

  const choose = (nextValue: string | undefined) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label={label}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`${label}: ${summary}`}
          aria-haspopup="dialog"
          aria-required={required || undefined}
          disabled={disabled}
        >
          <span className="trail-property-control__summary">{summary}</span>
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">{label}</div>
        {searchable ? (
          <input
            aria-label={`Search ${label.toLocaleLowerCase()}`}
            autoFocus
            className="trail-view-popover__search"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={`Search ${label.toLocaleLowerCase()}`}
            type="search"
            value={search}
          />
        ) : null}
        {!required && normalizedSearch === "" ? (
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
        ) : null}
        {visibleOptions.map((option) => (
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
        {searchable && visibleOptions.length === 0 ? (
          <div className="trail-view-popover__title">No matches</div>
        ) : null}
      </div>
    </TrailViewPopover>
  );
}
