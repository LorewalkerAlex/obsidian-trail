import { describe, expect, it } from "vitest";

import {
  createEmptyTrailSourceOwnership,
  removeTrailSourceOwnership,
  replaceTrailSourceOwnership,
} from "./trail-source-ownership";

describe("Trail source ownership", () => {
  it("replaces both directions atomically", () => {
    const first = replaceTrailSourceOwnership(createEmptyTrailSourceOwnership(), "Trail/A.md", ["a", "b"]);
    const next = replaceTrailSourceOwnership(first, "Trail/A.md", ["b", "c"]);
    expect(next.sourceByEntityId.get("a")).toBeUndefined();
    expect(next.sourceByEntityId.get("c")).toBe("Trail/A.md");
    expect(next.sourceEntityIdsByPath.get("Trail/A.md")).toEqual(["b", "c"]);

    const removed = removeTrailSourceOwnership(next, "Trail/A.md");
    expect(removed.sourceByEntityId.size).toBe(0);
    expect(removed.sourceEntityIdsByPath.size).toBe(0);
  });

  it("rejects cross-source identity collisions", () => {
    const first = replaceTrailSourceOwnership(createEmptyTrailSourceOwnership(), "Trail/A.md", ["same"]);
    expect(() => replaceTrailSourceOwnership(first, "Trail/B.md", ["same"]))
      .toThrow(/Duplicate Trail entity identity/);
  });
});
