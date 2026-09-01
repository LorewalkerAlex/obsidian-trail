import { describe, expect, it } from "vitest";

import { resolveTrailZonedDateTimeParts } from "../../domain/rules/trail-temporal-rules";
import {
  matchesTrailDueFilter,
  matchesTrailOptionalDiscreteFilter,
  matchesTrailSetDiscreteFilter,
} from "./trail-collection-filter";

function zoned(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
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

describe("shared collection discrete filter", () => {
  it("treats selected values as OR and explicit absence as a real value", () => {
    const clause = {
      kind: "discrete",
      values: [
        { kind: "none" },
        { kind: "value", value: "high" },
      ],
    } as const;

    expect(matchesTrailOptionalDiscreteFilter(undefined, clause)).toBe(true);
    expect(matchesTrailOptionalDiscreteFilter("high", clause)).toBe(true);
    expect(matchesTrailOptionalDiscreteFilter("low", clause)).toBe(false);
    expect(matchesTrailSetDiscreteFilter([], clause)).toBe(true);
    expect(matchesTrailSetDiscreteFilter(["high"], clause)).toBe(true);
    expect(matchesTrailSetDiscreteFilter(["other"], clause)).toBe(false);
  });
});

describe("shared collection Due filter", () => {
  it("uses local-calendar day boundaries across a DST transition", () => {
    const timezone = "America/New_York";
    const now = zoned(timezone, 2026, 3, 8, 12);

    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 3, 8, 23, 59),
      { kind: "today" },
      now,
      timezone,
    )).toBe(true);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 3, 9),
      { kind: "today" },
      now,
      timezone,
    )).toBe(false);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 3, 7, 23, 59),
      { kind: "overdue" },
      now,
      timezone,
    )).toBe(true);
  });

  it("treats this week as the current Monday through Sunday cutoff", () => {
    const timezone = "Asia/Singapore";
    const now = zoned(timezone, 2026, 9, 2, 12);

    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 9, 6, 23, 59),
      { kind: "this-week" },
      now,
      timezone,
    )).toBe(true);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 9, 7),
      { kind: "this-week" },
      now,
      timezone,
    )).toBe(false);
  });

  it("uses end-of-month and selected-date cutoffs", () => {
    const timezone = "Asia/Singapore";
    const now = zoned(timezone, 2026, 9, 2, 12);

    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 9, 30, 23, 59),
      { kind: "this-month" },
      now,
      timezone,
    )).toBe(true);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 10, 1),
      { kind: "this-month" },
      now,
      timezone,
    )).toBe(false);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 9, 18, 23, 59),
      { date: { day: 18, month: 9, year: 2026 }, kind: "date" },
      now,
      timezone,
    )).toBe(true);
    expect(matchesTrailDueFilter(
      zoned(timezone, 2026, 9, 19),
      { date: { day: 18, month: 9, year: 2026 }, kind: "date" },
      now,
      timezone,
    )).toBe(false);
  });
});
