import { readTrailZonedDateTimeParts } from "./trail-temporal-rules";

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/** Formats one Trail timestamp as an unambiguous local calendar date. */
export function formatTrailCalendarDate(timestamp: number, timezone: string): string {
  const parts = readTrailZonedDateTimeParts(timestamp, timezone);
  return `${parts.year}-${twoDigits(parts.month)}-${twoDigits(parts.day)}`;
}
