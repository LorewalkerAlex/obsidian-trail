import { describe, expect, it } from "vitest";

import {
  formatTrailLocalDateTime,
  parseTrailLocalDateTime,
} from "./trail-local-date-time";

describe("Trail local date-time interaction mapping", () => {
  it("round-trips a configured-zone datetime-local value", () => {
    const timestamp = parseTrailLocalDateTime("2026-08-16T18:30", "Asia/Singapore");
    expect(formatTrailLocalDateTime(timestamp, "Asia/Singapore")).toBe("2026-08-16T18:30");
  });

  it("rejects impossible calendar input instead of using the host timezone", () => {
    expect(() => parseTrailLocalDateTime("2026-02-30T10:00", "Asia/Singapore"))
      .toThrow("Due must use a valid local date and time");
  });
});
