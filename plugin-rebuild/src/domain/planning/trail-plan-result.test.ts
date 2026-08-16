import { describe, expect, it } from "vitest";

import {
  readyTrailPlan,
  rejectTrailPlan,
  trailPlanNeedsInput,
} from "./trail-plan-result";

describe("TrailPlanResult", () => {
  it("keeps ready, needs-input, and rejected distinct before optimistic state exists", () => {
    expect(readyTrailPlan({ commandId: "command-a" })).toEqual({
      kind: "ready",
      plan: { commandId: "command-a" },
    });
    expect(trailPlanNeedsInput("estimate-required", "Estimate is required")).toEqual({
      input: { code: "estimate-required", message: "Estimate is required" },
      kind: "needs-input",
    });
    expect(rejectTrailPlan("invalid-transition", "Transition is not allowed")).toEqual({
      kind: "rejected",
      reason: { code: "invalid-transition", message: "Transition is not allowed" },
    });
  });
});
