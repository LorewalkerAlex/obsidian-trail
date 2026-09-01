import type { TrailCalendarDate } from "../../domain/rules/trail-temporal-rules";
import {
  addTrailCalendarDays,
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
} from "../../domain/rules/trail-temporal-rules";

export type TrailFilterDiscreteValue =
  | { readonly kind: "none" }
  | { readonly kind: "value"; readonly value: string };

export type TrailDueFilterValue =
  | { readonly kind: "overdue" }
  | { readonly kind: "today" }
  | { readonly kind: "this-week" }
  | { readonly kind: "this-month" }
  | { readonly date: TrailCalendarDate; readonly kind: "date" };

export interface TrailDiscreteFilterClause {
  readonly kind: "discrete";
  readonly values: readonly TrailFilterDiscreteValue[];
}

export interface TrailDueFilterClause {
  readonly kind: "due";
  readonly value: TrailDueFilterValue;
}

export type TrailCollectionFilterClause =
  | TrailDiscreteFilterClause
  | TrailDueFilterClause;

export type TrailCollectionFilterState<PropertyId extends string = string> = Readonly<
  Partial<Record<PropertyId, TrailCollectionFilterClause>>
>;

export function isTrailCollectionFilterActive(
  state: TrailCollectionFilterState,
): boolean {
  return Object.values(state).some((clause) => clause !== undefined);
}

export function matchesTrailOptionalDiscreteFilter(
  value: string | undefined,
  clause: TrailDiscreteFilterClause | undefined,
): boolean {
  if (clause === undefined) return true;
  return clause.values.some((selected) => (
    selected.kind === "none"
      ? value === undefined
      : value === selected.value
  ));
}

export function matchesTrailSetDiscreteFilter(
  values: readonly string[],
  clause: TrailDiscreteFilterClause | undefined,
): boolean {
  if (clause === undefined) return true;
  return clause.values.some((selected) => (
    selected.kind === "none"
      ? values.length === 0
      : values.includes(selected.value)
  ));
}

function startOfCalendarDate(
  date: TrailCalendarDate,
  timezone: string,
): number {
  const normalized = new Date(Date.UTC(date.year, date.month - 1, date.day));
  if (
    normalized.getUTCFullYear() !== date.year
    || normalized.getUTCMonth() + 1 !== date.month
    || normalized.getUTCDate() !== date.day
  ) {
    throw new Error("Filter calendar date is invalid");
  }

  return resolveTrailZonedDateTimeParts({
    day: date.day,
    hour: 0,
    millisecond: 0,
    minute: 0,
    month: date.month,
    second: 0,
    year: date.year,
  }, timezone);
}

function startOfToday(now: number, timezone: string): number {
  const parts = readTrailZonedDateTimeParts(now, timezone);
  return startOfCalendarDate({
    day: parts.day,
    month: parts.month,
    year: parts.year,
  }, timezone);
}

function endOfCalendarDate(date: TrailCalendarDate, timezone: string): number {
  return addTrailCalendarDays(startOfCalendarDate(date, timezone), timezone, 1) - 1;
}

function isoWeekday(date: TrailCalendarDate): number {
  const sundayBased = new Date(Date.UTC(
    date.year,
    date.month - 1,
    date.day,
  )).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

export function matchesTrailDueFilter(
  due: number,
  filter: TrailDueFilterValue,
  now: number,
  timezone: string,
): boolean {
  const todayStart = startOfToday(now, timezone);

  switch (filter.kind) {
    case "overdue":
      return due < todayStart;
    case "today":
      return due <= addTrailCalendarDays(todayStart, timezone, 1) - 1;
    case "this-week": {
      const today = readTrailZonedDateTimeParts(todayStart, timezone);
      const calendarDate = {
        day: today.day,
        month: today.month,
        year: today.year,
      } satisfies TrailCalendarDate;
      const daysUntilNextMonday = 8 - isoWeekday(calendarDate);
      return due <= addTrailCalendarDays(todayStart, timezone, daysUntilNextMonday) - 1;
    }
    case "this-month": {
      const today = readTrailZonedDateTimeParts(todayStart, timezone);
      const nextMonth = new Date(Date.UTC(today.year, today.month, 1));
      const nextMonthStart = startOfCalendarDate({
        day: 1,
        month: nextMonth.getUTCMonth() + 1,
        year: nextMonth.getUTCFullYear(),
      }, timezone);
      return due <= nextMonthStart - 1;
    }
    case "date":
      return due <= endOfCalendarDate(filter.date, timezone);
  }
}
