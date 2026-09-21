import { useState } from "react";

import type { TrailTimestamp } from "../../domain/model/trail-values";
import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import {
  formatTrailCalendarDateInput,
  TrailCalendarDatePicker,
} from "../patterns/trail-calendar-date-picker";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";
import { TrailDueDate } from "./trail-due";

function calendarDateForTimestamp(timestamp: TrailTimestamp, timezone: string): TrailCalendarDate {
  const date = readTrailZonedDateTimeParts(timestamp, timezone);
  return { day: date.day, month: date.month, year: date.year };
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
  const referenceDate = calendarDateForTimestamp(value ?? referenceTimestamp, timezone);
  const [draft, setDraft] = useState(
    () => value === undefined ? "" : formatTrailCalendarDateInput(referenceDate),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(value === undefined ? "" : formatTrailCalendarDateInput(
        calendarDateForTimestamp(value, timezone),
      ));
    }
  };

  return (
    <TrailViewPopover
      label="Due"
      layer={layer}
      onOpenChange={handleOpenChange}
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
        <TrailCalendarDatePicker
          inputLabel="Due date"
          onDateSelect={(date) => {
            onValueChange(replaceCalendarDate(
              value ?? referenceTimestamp,
              timezone,
              date,
            ));
            setOpen(false);
          }}
          onValueChange={setDraft}
          referenceDate={referenceDate}
          value={draft}
        />
      </div>
    </TrailViewPopover>
  );
}
