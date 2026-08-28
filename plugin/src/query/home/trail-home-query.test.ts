import { describe, expect, it } from "vitest";

import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { selectTrailHomeSummary } from "./trail-home-query";

describe("Trail Home query", () => {
  it("projects only existing Runtime facts needed by Home", () => {
    const runtimeStore = createTrailTestRuntimeStore();

    expect(selectTrailHomeSummary(runtimeStore.getState())).toEqual({
      initiativeCount: 1,
      projectCount: 2,
    });
  });
});
