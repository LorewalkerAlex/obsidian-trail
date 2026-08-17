import { describe, expect, it } from "vitest";

import {
  addTrailCalendarDays,
  readTrailZonedDateTimeParts,
  resolveTrailCycleDefaultEndDate,
  resolveTrailTriageDefaultDue,
} from "./trail-temporal-rules";

describe("Trail temporal rules", () => {
  it("adds calendar days without turning DST into fixed 24-hour arithmetic", () => {
    const beforeSpringForward = Date.UTC(2026, 2, 7, 17, 30); // 12:30 in New York.
    const nextDay = addTrailCalendarDays(beforeSpringForward, "America/New_York", 1);
    expect(nextDay - beforeSpringForward).toBe(23 * 60 * 60 * 1000);
  });

  it("resolves the Quick Capture Due seven local calendar days later", () => {
    const beforeSpringForward = Date.UTC(2026, 2, 7, 17, 30); // 12:30 in New York.
    const due = resolveTrailTriageDefaultDue(beforeSpringForward, "America/New_York");

    expect(due - beforeSpringForward).toBe((7 * 24 - 1) * 60 * 60 * 1000);
    expect(readTrailZonedDateTimeParts(due, "America/New_York")).toMatchObject({
      day: 14,
      hour: 12,
      minute: 30,
      month: 3,
      year: 2026,
    });
  });

  it("resolves EndOfNextWeek to the following natural Sunday's local date", () => {
    const monday = Date.UTC(2026, 7, 17, 1); // 09:00 Monday in Singapore.
    const sunday = Date.UTC(2026, 7, 23, 1); // 09:00 Sunday in Singapore.

    expect(resolveTrailCycleDefaultEndDate(
      monday,
      "Asia/Singapore",
      "end-of-next-week",
    )).toEqual({ day: 30, month: 8, year: 2026 });

    expect(resolveTrailCycleDefaultEndDate(
      sunday,
      "Asia/Singapore",
      "end-of-next-week",
    )).toEqual({ day: 30, month: 8, year: 2026 });
  });
});
