import { useEffect, useState } from "react";

import type { TrailCalendarDate } from "../../domain/rules/trail-temporal-rules";
import { TrailIconButton } from "../primitives/trail-icon-button";
import { TrailInput } from "../primitives/trail-input";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type TrailCalendarMonth = {
  readonly month: number;
  readonly year: number;
};

export interface TrailCalendarDatePickerProps {
  readonly autoFocus?: boolean;
  readonly disabled?: boolean;
  readonly inputLabel: string;
  readonly onDateSelect?: (date: TrailCalendarDate) => void;
  readonly onValueChange: (value: string) => void;
  readonly referenceDate?: TrailCalendarDate;
  readonly value: string;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTrailCalendarDateInput(date: TrailCalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${twoDigits(date.month)}-${twoDigits(date.day)}`;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseTrailCalendarDateInput(value: string): TrailCalendarDate | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return undefined;

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }
  return { day, month, year };
}

function monthForDate(date: TrailCalendarDate): TrailCalendarMonth {
  return { month: date.month, year: date.year };
}

function currentLocalDate(): TrailCalendarDate {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function shiftMonth(value: TrailCalendarMonth, offset: number): TrailCalendarMonth {
  const zeroBased = value.year * 12 + value.month - 1 + offset;
  const year = Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12 + 1;
  return { month, year };
}

function firstWeekdayIndex(year: number, month: number): number {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, 1);
  return (date.getUTCDay() + 6) % 7;
}

function TrailCalendarChevron({ direction }: { readonly direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d={direction === "left" ? "M9.75 4.5 6.25 8l3.5 3.5" : "M6.25 4.5 9.75 8l-3.5 3.5"} />
    </svg>
  );
}

export function TrailCalendarDatePicker({
  autoFocus = false,
  disabled = false,
  inputLabel,
  onDateSelect,
  onValueChange,
  referenceDate,
  value,
}: TrailCalendarDatePickerProps) {
  const parsedValue = parseTrailCalendarDateInput(value);
  const initialDate = parsedValue ?? referenceDate ?? currentLocalDate();
  const [viewMonth, setViewMonth] = useState<TrailCalendarMonth>(() => monthForDate(initialDate));
  const targetYear = parsedValue?.year ?? referenceDate?.year;
  const targetMonth = parsedValue?.month ?? referenceDate?.month;

  useEffect(() => {
    if (targetYear === undefined || targetMonth === undefined) return;
    setViewMonth((current) => (
      current.year === targetYear && current.month === targetMonth
        ? current
        : { month: targetMonth, year: targetYear }
    ));
  }, [targetMonth, targetYear]);

  const firstDayOffset = firstWeekdayIndex(viewMonth.year, viewMonth.month);
  const monthLength = daysInMonth(viewMonth.year, viewMonth.month);
  const monthLabel = `${MONTH_NAMES[viewMonth.month - 1]} ${viewMonth.year}`;

  const selectDate = (date: TrailCalendarDate) => {
    const nextValue = formatTrailCalendarDateInput(date);
    onValueChange(nextValue);
    onDateSelect?.(date);
  };

  return (
    <div className="trail-calendar-picker">
      <TrailInput
        aria-invalid={value !== "" && parsedValue === undefined}
        aria-label={inputLabel}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        inputMode="numeric"
        maxLength={10}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          onValueChange(nextValue);
          const date = parseTrailCalendarDateInput(nextValue);
          if (date !== undefined) onDateSelect?.(date);
        }}
        placeholder="YYYY-MM-DD"
        spellCheck={false}
        value={value}
      />

      <div className="trail-calendar-picker__header">
        <TrailIconButton
          disabled={disabled}
          icon={<TrailCalendarChevron direction="left" />}
          label="Previous month"
          onClick={() => setViewMonth((current) => shiftMonth(current, -1))}
        />
        <div aria-live="polite" className="trail-calendar-picker__month">{monthLabel}</div>
        <TrailIconButton
          disabled={disabled}
          icon={<TrailCalendarChevron direction="right" />}
          label="Next month"
          onClick={() => setViewMonth((current) => shiftMonth(current, 1))}
        />
      </div>

      <div aria-hidden="true" className="trail-calendar-picker__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="trail-calendar-picker__grid">
        {Array.from({ length: 42 }, (_, index) => {
          const day = index - firstDayOffset + 1;
          if (day < 1 || day > monthLength) {
            return <span className="trail-calendar-picker__blank" key={`blank-${index}`} />;
          }

          const date: TrailCalendarDate = { day, month: viewMonth.month, year: viewMonth.year };
          const dateValue = formatTrailCalendarDateInput(date);
          const selected = parsedValue?.year === date.year
            && parsedValue.month === date.month
            && parsedValue.day === date.day;
          return (
            <button
              aria-label={dateValue}
              aria-pressed={selected}
              className="trail-calendar-picker__day"
              data-selected={selected ? "true" : undefined}
              disabled={disabled}
              key={dateValue}
              onClick={() => selectDate(date)}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
