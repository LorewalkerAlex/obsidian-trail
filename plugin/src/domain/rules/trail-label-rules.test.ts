import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { findTrailLabelSelectionViolations } from "./trail-label-rules";

describe("Trail Label rules", () => {
  it("accepts registered Label selections and detects missing or out-of-scope Labels", () => {
    const base = createTrailTestConfiguration();
    const configuration = {
      ...base,
      labelGroups: [
        ...base.labelGroups,
        {
          id: "group-initiative-only",
          name: "Initiative only",
          registeredEntityTypes: ["initiative" as const],
          selectionMode: "multiple" as const,
        },
      ],
      labels: [
        ...base.labels,
        {
          groupId: "group-initiative-only",
          id: "label-initiative-only",
          name: "Initiative only",
        },
      ],
    };

    expect(findTrailLabelSelectionViolations(
      configuration,
      "issue",
      ["label-work"],
    )).toEqual([]);
    expect(findTrailLabelSelectionViolations(
      configuration,
      "issue",
      ["label-missing", "label-initiative-only"],
    )).toEqual([
      { kind: "label-missing", labelId: "label-missing" },
      {
        groupId: "group-initiative-only",
        kind: "label-scope",
        labelId: "label-initiative-only",
      },
    ]);
  });

  it("detects multiple selections from a single-select group", () => {
    const base = createTrailTestConfiguration();
    const configuration = {
      ...base,
      labels: [
        ...base.labels,
        { groupId: "group-area", id: "label-home", name: "Home" },
      ],
    };

    expect(findTrailLabelSelectionViolations(
      configuration,
      "project",
      ["label-work", "label-home"],
    )).toEqual([
      {
        groupId: "group-area",
        kind: "single-selection",
        labelIds: ["label-work", "label-home"],
      },
    ]);
  });
});
