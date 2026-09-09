import { describe, expect, it } from "vitest";

import {
  reconcileTrailCollectionSelection,
  setTrailCollectionSelection,
} from "./trail-collection-selection-state";

describe("shared collection Selection state", () => {
  it("toggles one visible identity and preserves a stable range anchor", () => {
    const visible = ["a", "b", "c", "d"];
    const first = setTrailCollectionSelection(
      { anchorId: null, selectedIds: new Set<string>() },
      visible,
      "b",
      true,
    );
    const ranged = setTrailCollectionSelection(first, visible, "d", true, true);

    expect(Array.from(ranged.selectedIds)).toEqual(["b", "c", "d"]);
    expect(ranged.anchorId).toBe("b");

    const clearedRange = setTrailCollectionSelection(ranged, visible, "c", false, true);
    expect(Array.from(clearedRange.selectedIds)).toEqual(["d"]);
    expect(clearedRange.anchorId).toBe("b");
  });

  it("drops selected and anchor identities that leave the visible actionable projection", () => {
    const reconciled = reconcileTrailCollectionSelection({
      anchorId: "b",
      selectedIds: new Set(["a", "b", "c"]),
    }, ["a", "c"]);

    expect(Array.from(reconciled.selectedIds)).toEqual(["a", "c"]);
    expect(reconciled.anchorId).toBeNull();
  });
});
