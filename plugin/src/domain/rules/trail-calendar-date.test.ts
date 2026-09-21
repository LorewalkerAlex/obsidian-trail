import { describe, expect, it } from "vitest";

import { formatTrailCalendarDate } from "./trail-calendar-date";

describe("Trail calendar date presentation", () => {
  it("uses the configured timezone and zero-padded ISO calendar fields", () => {
    const timestamp = Date.UTC(2026, 8, 2, 16);

    expect(formatTrailCalendarDate(timestamp, "Asia/Singapore"))
      .toBe("2026-09-03");
    expect(formatTrailCalendarDate(timestamp, "UTC"))
      .toBe("2026-09-02");
  });
});
