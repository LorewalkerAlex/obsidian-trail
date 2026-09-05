import { Popover } from "radix-ui";
import { useState } from "react";

import type { TrailTimestamp } from "../../domain/model/trail-values";
import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailDueDate } from "./trail-due";

function calendarDateToInputValue(date: TrailCalendarDate): string {
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
  ) {
    return undefined;
  }
  return { day, month, year };
}

export function replaceTrailDueCalendarDate(
  timestamp: TrailTimestamp,
  timezone: string,
  date: TrailCalendarDate,
): TrailTimestamp {
  const current = readTrailZonedDateTimeParts(timestamp, timezone);
  return resolveTrailZonedDateTimeParts({
    ...current,
    day: date.day,
    month: date.month,
    year: date.year,
  }, timezone);
}

function TrailCalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="trail-due-select__icon"
      viewBox="0 0 16 16"
    >
      <path d="M3.25 4.5h9.5v8h-9.5zM5 2.75v3M11 2.75v3M3.25 7h9.5" />
    </svg>
  );
}

export interface TrailDuePropertySelectProps {
  readonly disabled?: boolean;
  readonly layer?: "menu" | "modal-child";
  readonly onValueChange: (timestamp: TrailTimestamp) => void;
  readonly timezone: string;
  readonly value: TrailTimestamp;
}

export function TrailDuePropertySelect({
  disabled = false,
  layer = "menu",
  onValueChange,
  timezone,
  value,
}: TrailDuePropertySelectProps) {
  const [open, setOpen] = useState(false);
  const current = readTrailZonedDateTimeParts(value, timezone);
  const inputValue = calendarDateToInputValue({
    day: current.day,
    month: current.month,
    year: current.year,
  });

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <TrailPropertyControl
          aria-label="Review due"
          aria-haspopup="dialog"
          disabled={disabled}
        >
          <TrailCalendarIcon />
          <TrailDueDate timestamp={value} timezone={timezone} />
        </TrailPropertyControl>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          aria-label="Review due"
          className="trail-due-select"
          data-trail-transient-layer={layer}
          collisionPadding={8}
          sideOffset={4}
        >
          <div className="trail-due-select__title">Review due</div>
          <label className="trail-due-select__field">
            <span>Date</span>
            <input
              aria-label="Review due date"
              autoFocus
              onChange={(event) => {
                const date = parseCalendarDate(event.currentTarget.value);
                if (date !== undefined) {
                  onValueChange(replaceTrailDueCalendarDate(value, timezone, date));
                  setOpen(false);
                }
              }}
              type="date"
              value={inputValue}
            />
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
