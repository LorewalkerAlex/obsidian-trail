import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
} from "../../domain/rules/trail-temporal-rules";

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Formats a Trail Timestamp for an HTML datetime-local control in the configured zone. */
export function formatTrailLocalDateTime(
  epochMilliseconds: number,
  timezone: string,
): string {
  const parts = readTrailZonedDateTimeParts(epochMilliseconds, timezone);
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

/** Parses one HTML datetime-local value without leaking the host machine timezone. */
export function parseTrailLocalDateTime(
  value: string,
  timezone: string,
): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (match === null) throw new Error("Due must use a valid local date and time");

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

  return resolveTrailZonedDateTimeParts({
    day,
    hour,
    millisecond: 0,
    minute,
    month,
    second: 0,
    year,
  }, timezone);
}
