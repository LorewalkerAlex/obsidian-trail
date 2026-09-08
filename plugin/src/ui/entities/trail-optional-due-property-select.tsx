import { useState } from "react";

import type { TrailTimestamp } from "../../domain/model/trail-values";
import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";
import { TrailDueDate } from "./trail-due";

function calendarDateToInputValue(timestamp: TrailTimestamp, timezone: string): string {
  const date = readTrailZonedDateTimeParts(timestamp, timezone);
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("-");
}

function parseCalendarDate(value: string): TrailCalendarDate | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return undefined;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) return undefined;
  return { day, month, year };
}

function replaceCalendarDate(
  referenceTimestamp: TrailTimestamp,
  timezone: string,
  date: TrailCalendarDate,
): TrailTimestamp {
  const reference = readTrailZonedDateTimeParts(referenceTimestamp, timezone);
  return resolveTrailZonedDateTimeParts({
    ...reference,
    day: date.day,
    month: date.month,
    year: date.year,
  }, timezone);
}

function TrailCalendarIcon() {
  return (
    <svg aria-hidden="true" className="trail-due-select__icon" viewBox="0 0 16 16">
      <path d="M3.25 4.5h9.5v8h-9.5zM5 2.75v3M11 2.75v3M3.25 7h9.5" />
    </svg>
  );
}

export interface TrailOptionalDuePropertySelectProps {
  readonly disabled?: boolean;
  readonly layer?: "menu" | "modal-child";
  readonly onValueChange: (value: TrailTimestamp | undefined) => void;
  readonly referenceTimestamp: TrailTimestamp;
  readonly timezone: string;
  readonly value: TrailTimestamp | undefined;
}

/** Shared nullable Due editor for optional-Due entity properties and creation. */
export function TrailOptionalDuePropertySelect({
  disabled = false,
  layer = "menu",
  onValueChange,
  referenceTimestamp,
  timezone,
  value,
}: TrailOptionalDuePropertySelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <TrailViewPopover
      label="Due"
      layer={layer}
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Due: ${value === undefined ? "No due" : "Set"}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          <TrailCalendarIcon />
          {value === undefined
            ? "No due"
            : <TrailDueDate timestamp={value} timezone={timezone} />}
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Due</div>
        {value === undefined ? null : (
          <button
            className="trail-view-popover__item"
            onClick={() => {
              onValueChange(undefined);
              setOpen(false);
            }}
            type="button"
          >
            <span>No due</span>
          </button>
        )}
        <label className="trail-view-popover__date-field">
          <span>Date</span>
          <input
            aria-label="Due date"
            onChange={(event) => {
              const date = parseCalendarDate(event.currentTarget.value);
              if (date === undefined) return;
              onValueChange(replaceCalendarDate(
                value ?? referenceTimestamp,
                timezone,
                date,
              ));
              setOpen(false);
            }}
            type="date"
            value={value === undefined ? "" : calendarDateToInputValue(value, timezone)}
          />
        </label>
      </div>
    </TrailViewPopover>
  );
}
