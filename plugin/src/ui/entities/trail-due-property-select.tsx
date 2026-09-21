import { Popover } from "radix-ui";
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
import { TrailDueDate } from "./trail-due";

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
  const current = readTrailZonedDateTimeParts(value, timezone);
  const currentDate: TrailCalendarDate = {
    day: current.day,
    month: current.month,
    year: current.year,
  };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => formatTrailCalendarDateInput(currentDate));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setDraft(formatTrailCalendarDateInput(currentDate));
  };

  return (
    <Popover.Root onOpenChange={handleOpenChange} open={open}>
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
          <TrailCalendarDatePicker
            autoFocus
            inputLabel="Review due date"
            onDateSelect={(date) => {
              onValueChange(replaceTrailDueCalendarDate(value, timezone, date));
              setOpen(false);
            }}
            onValueChange={setDraft}
            referenceDate={currentDate}
            value={draft}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
