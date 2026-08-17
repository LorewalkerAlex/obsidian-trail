import { describe, expect, it } from "vitest";

import { addTrailCalendarDays } from "./trail-temporal-rules";

describe("Trail temporal rules", () => {
  it("adds calendar days without turning DST into fixed 24-hour arithmetic", () => {
    const beforeSpringForward = Date.UTC(2026, 2, 7, 17, 30); // 12:30 in New York.
    const nextDay = addTrailCalendarDays(beforeSpringForward, "America/New_York", 1);
    expect(nextDay - beforeSpringForward).toBe(23 * 60 * 60 * 1000);
  });
});
