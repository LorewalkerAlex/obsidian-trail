import { describe, expect, it } from "vitest";

import { addCalendarDaysInTimeZone } from "./trail-temporal";

describe("Formal temporal policy", () => {
  it("adds ordinary calendar days without changing local wall-clock time", () => {
    const source = Date.UTC(2026, 7, 13, 2, 30, 15, 250);

    expect(addCalendarDaysInTimeZone(source, "UTC", 7)).toBe(
      Date.UTC(2026, 7, 20, 2, 30, 15, 250),
    );
  });

  it("preserves local noon across spring-forward instead of adding 168 hours", () => {
    const source = Date.UTC(2026, 2, 1, 17, 0, 0, 0); // 12:00 America/New_York
    const result = addCalendarDaysInTimeZone(
      source,
      "America/New_York",
      7,
    );

    expect(result).toBe(Date.UTC(2026, 2, 8, 16, 0, 0, 0));
    expect(result - source).toBe(167 * 60 * 60 * 1000);
  });

  it("preserves local noon across fall-back instead of adding 168 hours", () => {
    const source = Date.UTC(2026, 9, 25, 16, 0, 0, 0); // 12:00 America/New_York
    const result = addCalendarDaysInTimeZone(
      source,
      "America/New_York",
      7,
    );

    expect(result).toBe(Date.UTC(2026, 10, 1, 17, 0, 0, 0));
    expect(result - source).toBe(169 * 60 * 60 * 1000);
  });

  it("uses the compatible later time when the target wall-clock time does not exist", () => {
    const source = Date.UTC(2026, 2, 1, 7, 30, 0, 0); // 02:30 EST

    expect(addCalendarDaysInTimeZone(
      source,
      "America/New_York",
      7,
    )).toBe(Date.UTC(2026, 2, 8, 7, 30, 0, 0)); // 03:30 EDT
  });
});
