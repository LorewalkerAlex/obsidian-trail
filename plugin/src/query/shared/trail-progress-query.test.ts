import { describe, expect, it } from "vitest";

import { createTrailProgressReadModel } from "./trail-progress-query";

describe("Trail progress query", () => {
  it("counts Completed over the non-Canceled scope without partial credit", () => {
    expect(createTrailProgressReadModel([
      "backlog",
      "unstarted",
      "started",
      "completed",
      "canceled",
    ])).toEqual({ max: 4, value: 1 });
  });

  it("keeps an empty effective denominator unavailable", () => {
    expect(createTrailProgressReadModel([])).toEqual({ unavailable: true });
    expect(createTrailProgressReadModel(["canceled"])).toEqual({ unavailable: true });
  });
});
