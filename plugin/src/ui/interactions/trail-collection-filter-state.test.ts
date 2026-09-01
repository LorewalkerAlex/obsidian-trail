import { describe, expect, it } from "vitest";

import {
  clearTrailFilterClause,
  setTrailDueFilterValue,
  toggleTrailDiscreteFilterValue,
} from "./trail-collection-filter-state";

describe("shared collection Filter state", () => {
  it("toggles discrete values and removes an empty clause", () => {
    const withHigh = toggleTrailDiscreteFilterValue({}, "priority", {
      kind: "value",
      value: "high",
    });
    const withHighAndNone = toggleTrailDiscreteFilterValue(withHigh, "priority", {
      kind: "none",
    });

    expect(withHighAndNone.priority).toEqual({
      kind: "discrete",
      values: [
        { kind: "value", value: "high" },
        { kind: "none" },
      ],
    });
    expect(toggleTrailDiscreteFilterValue(
      toggleTrailDiscreteFilterValue(withHighAndNone, "priority", { kind: "none" }),
      "priority",
      { kind: "value", value: "high" },
    )).toEqual({});
  });

  it("replaces Due as one single-choice clause and clears one property independently", () => {
    const withDue = setTrailDueFilterValue<"due" | "priority">(
      {},
      "due",
      { kind: "today" },
    );
    const replaced = setTrailDueFilterValue<"due" | "priority">(
      withDue,
      "due",
      { kind: "this-week" },
    );
    const withPriority = toggleTrailDiscreteFilterValue<"due" | "priority">(
      replaced,
      "priority",
      { kind: "value", value: "urgent" },
    );

    expect(withPriority.due).toEqual({ kind: "due", value: { kind: "this-week" } });
    expect(clearTrailFilterClause(withPriority, "due")).toEqual({
      priority: {
        kind: "discrete",
        values: [{ kind: "value", value: "urgent" }],
      },
    });
  });
});
