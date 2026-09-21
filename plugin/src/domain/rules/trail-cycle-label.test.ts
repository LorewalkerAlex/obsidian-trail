import { describe, expect, it } from "vitest";

import { formatTrailCycleLabel } from "./trail-cycle-label";

describe("Trail Cycle temporal label", () => {
  it("uses only the actual start while the Cycle is open", () => {
    expect(formatTrailCycleLabel({
      startedAt: Date.UTC(2026, 8, 20, 4),
    }, "Asia/Singapore")).toBe("Current: 2026-09-20");
  });

  it("uses actual start and actual close for Historical Cycle identity", () => {
    expect(formatTrailCycleLabel({
      endedAt: Date.UTC(2026, 9, 3, 4),
      startedAt: Date.UTC(2026, 8, 20, 4),
    }, "Asia/Singapore")).toBe("2026-09-20 to 2026-10-03");
  });

  it("does not need or expose planned end in the identity contract", () => {
    const source = {
      endedAt: Date.UTC(2026, 8, 27, 4),
      startedAt: Date.UTC(2026, 8, 20, 4),
    };

    expect(formatTrailCycleLabel(source, "Asia/Singapore"))
      .toBe("2026-09-20 to 2026-09-27");
  });
});
