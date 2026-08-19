import { describe, expect, it } from "vitest";

import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { selectTrailHomeSummary } from "./trail-home-query";

describe("Trail Home query", () => {
  it("projects only existing Runtime facts needed by Home", () => {
    const harness = createTrailUiTestHarness();

    expect(selectTrailHomeSummary(harness.runtimeStore.getState())).toEqual({
      initiativeCount: 1,
      projectCount: 2,
    });
  });
});
