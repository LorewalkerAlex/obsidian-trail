import { isTrailEpochMilliseconds } from "./trail-issue";

interface ZonedDateTimeParts {
  readonly day: number;
  readonly hour: number;
  readonly millisecond: number;
  readonly minute: number;
  readonly month: number;
  readonly second: number;
  readonly year: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const existing = formatterCache.get(timezone);
  if (existing !== undefined) {
    return existing;
  }

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

function zonedParts(
  epochMilliseconds: number,
  timezone: string,
): ZonedDateTimeParts {
  const values = new Map<string, string>();
  for (const part of formatterFor(timezone).formatToParts(
    new Date(epochMilliseconds),
  )) {
    if (part.type !== "literal") {
      values.set(part.type, part.value);
    }
  }

  const read = (name: string): number => {
    const value = values.get(name);
    if (value === undefined) {
      throw new Error(`Intl formatter did not return ${name}`);
    }
    return Number.parseInt(value, 10);
  };

  return {
    day: read("day"),
    hour: read("hour"),
    millisecond: epochMilliseconds % 1000,
    minute: read("minute"),
    month: read("month"),
    second: read("second"),
    year: read("year"),
  };
}

function asUtcEpoch(parts: ZonedDateTimeParts): number {
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
  return asUtcEpoch(zonedParts(epochMilliseconds, timezone)) - epochMilliseconds;
}

/**
 * Resolves one local wall-clock value in an IANA timezone. Ambiguous fall-back
 * times choose the earlier instant; nonexistent spring-forward times choose the
 * first compatible later wall-clock value, matching common calendar semantics.
 */
function localPartsToEpochCompatible(
  desired: ZonedDateTimeParts,
  timezone: string,
): number {
  const desiredAsUtc = asUtcEpoch(desired);
  const sampleHours = [-36, -12, 0, 12, 36] as const;
  const offsets = new Set<number>();

  for (const hours of sampleHours) {
    offsets.add(offsetAt(desiredAsUtc + hours * 60 * 60 * 1000, timezone));
  }

  const exact: number[] = [];
  const later: { delta: number; epoch: number }[] = [];

  for (const offset of offsets) {
    const candidate = desiredAsUtc - offset;
    const actualAsUtc = asUtcEpoch(zonedParts(candidate, timezone));
    const delta = actualAsUtc - desiredAsUtc;

    if (delta === 0) {
      exact.push(candidate);
    } else if (delta > 0) {
      later.push({ delta, epoch: candidate });
    }
  }

  if (exact.length > 0) {
    return Math.min(...exact);
  }

  if (later.length > 0) {
    later.sort((left, right) => left.delta - right.delta || left.epoch - right.epoch);
    return later[0].epoch;
  }

  throw new Error(`Unable to resolve local calendar time in timezone: ${timezone}`);
}

/**
 * Adds calendar days in the configured IANA timezone while preserving local
 * wall-clock time. This deliberately differs from adding N * 24 hours across DST.
 */
export function addCalendarDaysInTimeZone(
  epochMilliseconds: number,
  timezone: string,
  days: number,
): number {
  if (!isTrailEpochMilliseconds(epochMilliseconds)) {
    throw new Error("Calendar-day source timestamp is invalid");
  }
  if (!Number.isSafeInteger(days)) {
    throw new Error("Calendar-day offset must be an integer");
  }

  // Constructing the target through UTC normalizes month/year boundaries without
  // asking the host machine's local timezone to interpret the calendar fields.
  const source = zonedParts(epochMilliseconds, timezone);
  const normalizedTarget = new Date(Date.UTC(
    source.year,
    source.month - 1,
    source.day + days,
    source.hour,
    source.minute,
    source.second,
    source.millisecond,
  ));
  const target: ZonedDateTimeParts = {
    day: normalizedTarget.getUTCDate(),
    hour: normalizedTarget.getUTCHours(),
    millisecond: normalizedTarget.getUTCMilliseconds(),
    minute: normalizedTarget.getUTCMinutes(),
    month: normalizedTarget.getUTCMonth() + 1,
    second: normalizedTarget.getUTCSeconds(),
    year: normalizedTarget.getUTCFullYear(),
  };

  return localPartsToEpochCompatible(target, timezone);
}

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Formats a Timestamp for an HTML datetime-local control in the configured zone. */
export function formatLocalDateTimeInTimeZone(
  epochMilliseconds: number,
  timezone: string,
): string {
  if (!isTrailEpochMilliseconds(epochMilliseconds)) {
    throw new Error("Local date-time source timestamp is invalid");
  }
  const parts = zonedParts(epochMilliseconds, timezone);
  return [
    parts.year.toString().padStart(4, "0"),
    "-",
    padTwo(parts.month),
    "-",
    padTwo(parts.day),
    "T",
    padTwo(parts.hour),
    ":",
    padTwo(parts.minute),
  ].join("");
}

/** Resolves an HTML datetime-local value in the configured IANA timezone. */
export function parseLocalDateTimeInTimeZone(
  value: string,
  timezone: string,
): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (match === null) {
    throw new Error("Due must use a valid local date and time");
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const calendarProbe = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1
    || month > 12
    || day < 1
    || calendarProbe.getUTCFullYear() !== year
    || calendarProbe.getUTCMonth() !== month - 1
    || calendarProbe.getUTCDate() !== day
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    throw new Error("Due must use a valid local date and time");
  }

  return localPartsToEpochCompatible({
    day,
    hour,
    millisecond: 0,
    minute,
    month,
    second: 0,
    year,
  }, timezone);
}
