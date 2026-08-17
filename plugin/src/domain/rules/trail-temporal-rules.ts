import type { TrailCycleConfiguration } from "../model/trail-configuration";
import { isTrailTimestamp } from "../validation/trail-value-validation";

export interface TrailZonedDateTimeParts {
  readonly day: number;
  readonly hour: number;
  readonly millisecond: number;
  readonly minute: number;
  readonly month: number;
  readonly second: number;
  readonly year: number;
}

export interface TrailCalendarDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

const TRAIL_TRIAGE_DEFAULT_REVIEW_DAYS = 7;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timezone);
  if (cached !== undefined) return cached;
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  formatterCache.set(timezone, formatter);
  return formatter;
}

function zonedPartsUnchecked(
  epochMilliseconds: number,
  timezone: string,
): TrailZonedDateTimeParts {
  const values = new Map<string, string>();
  for (const part of formatterFor(timezone).formatToParts(new Date(epochMilliseconds))) {
    if (part.type !== "literal") values.set(part.type, part.value);
  }
  const read = (key: string): number => {
    const value = values.get(key);
    if (value === undefined) throw new Error(`Intl formatter did not return ${key}`);
    return Number.parseInt(value, 10);
  };
  return {
    day: read("day"),
    hour: read("hour"),
    millisecond: ((epochMilliseconds % 1000) + 1000) % 1000,
    minute: read("minute"),
    month: read("month"),
    second: read("second"),
    year: read("year"),
  };
}

/** Reads one Trail Timestamp as calendar fields in the configured IANA timezone. */
export function readTrailZonedDateTimeParts(
  epochMilliseconds: number,
  timezone: string,
): TrailZonedDateTimeParts {
  if (!isTrailTimestamp(epochMilliseconds)) {
    throw new Error("Zoned date-time timestamp is invalid");
  }
  return zonedPartsUnchecked(epochMilliseconds, timezone);
}

function asUtcEpoch(parts: TrailZonedDateTimeParts): number {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
}

function offsetAt(epochMilliseconds: number, timezone: string): number {
  return asUtcEpoch(zonedPartsUnchecked(epochMilliseconds, timezone)) - epochMilliseconds;
}

/**
 * Resolves local calendar fields with compatible overlap/gap semantics: choose
 * the earlier instant in an overlap and the first compatible later wall time in
 * a DST gap.
 */
export function resolveTrailZonedDateTimeParts(
  desired: TrailZonedDateTimeParts,
  timezone: string,
): number {
  const desiredAsUtc = asUtcEpoch(desired);
  const offsets = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36] as const) {
    offsets.add(offsetAt(desiredAsUtc + hours * 60 * 60 * 1000, timezone));
  }
  const exact: number[] = [];
  const later: Array<{ readonly delta: number; readonly epoch: number }> = [];
  for (const offset of offsets) {
    const candidate = desiredAsUtc - offset;
    const delta = asUtcEpoch(zonedPartsUnchecked(candidate, timezone)) - desiredAsUtc;
    if (delta === 0) exact.push(candidate);
    else if (delta > 0) later.push({ delta, epoch: candidate });
  }
  if (exact.length > 0) return Math.min(...exact);
  if (later.length > 0) {
    later.sort((left, right) => left.delta - right.delta || left.epoch - right.epoch);
    return later[0].epoch;
  }
  throw new Error(`Unable to resolve local calendar time in timezone: ${timezone}`);
}

/** Adds calendar days while preserving local wall-clock time across DST boundaries. */
export function addTrailCalendarDays(
  epochMilliseconds: number,
  timezone: string,
  days: number,
): number {
  if (!isTrailTimestamp(epochMilliseconds)) throw new Error("Calendar-day timestamp is invalid");
  if (!Number.isSafeInteger(days)) throw new Error("Calendar-day offset must be an integer");

  const source = readTrailZonedDateTimeParts(epochMilliseconds, timezone);
  const normalized = new Date(Date.UTC(
    source.year,
    source.month - 1,
    source.day + days,
    source.hour,
    source.minute,
    source.second,
    source.millisecond,
  ));
  return resolveTrailZonedDateTimeParts({
    day: normalized.getUTCDate(),
    hour: normalized.getUTCHours(),
    millisecond: normalized.getUTCMilliseconds(),
    minute: normalized.getUTCMinutes(),
    month: normalized.getUTCMonth() + 1,
    second: normalized.getUTCSeconds(),
    year: normalized.getUTCFullYear(),
  }, timezone);
}

/** Quick Capture schedules the first Triage review seven local calendar days later. */
export function resolveTrailTriageDefaultDue(
  effectiveAt: number,
  timezone: string,
): number {
  return addTrailCalendarDays(
    effectiveAt,
    timezone,
    TRAIL_TRIAGE_DEFAULT_REVIEW_DAYS,
  );
}

function localIsoWeekday(parts: TrailZonedDateTimeParts): number {
  const sundayBased = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
  )).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

/**
 * Resolves the configured Cycle end suggestion as a local calendar date only.
 * Input/display policy later turns that date into the concrete persisted Timestamp.
 */
export function resolveTrailCycleDefaultEndDate(
  startedAt: number,
  timezone: string,
  rule: TrailCycleConfiguration["defaultEndRule"],
): TrailCalendarDate {
  if (rule !== "end-of-next-week") {
    throw new Error(`Unsupported Cycle default end rule: ${String(rule)}`);
  }

  const start = readTrailZonedDateTimeParts(startedAt, timezone);
  const daysUntilFollowingSunday = (7 - localIsoWeekday(start)) + 7;
  const suggestedAt = addTrailCalendarDays(
    startedAt,
    timezone,
    daysUntilFollowingSunday,
  );
  const suggested = readTrailZonedDateTimeParts(suggestedAt, timezone);
  return {
    day: suggested.day,
    month: suggested.month,
    year: suggested.year,
  };
}
