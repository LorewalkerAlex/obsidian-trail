import { describe, expect, it } from "vitest";

import {
  removeTrailSourceOwnership,
  replaceTrailSourceOwnership,
} from "./trail-source-ownership";

describe("Trail Runtime source ownership", () => {
  it("replaces one source contribution without disturbing unrelated ownership", () => {
    const initial = {
      sourceByEntityId: { a: "A.md", b: "B.md" },
      sourceEntityIdsByPath: { "A.md": ["a"], "B.md": ["b"] },
    };

    const replaced = replaceTrailSourceOwnership(initial, "A.md", ["a2"]);
    expect(replaced).toEqual({
      sourceByEntityId: { a2: "A.md", b: "B.md" },
      sourceEntityIdsByPath: { "A.md": ["a2"], "B.md": ["b"] },
    });

    expect(removeTrailSourceOwnership(replaced, "A.md")).toEqual({
      sourceByEntityId: { b: "B.md" },
      sourceEntityIdsByPath: { "B.md": ["b"] },
    });
  });

  it("rejects a stable identity already owned by another source", () => {
    expect(() => replaceTrailSourceOwnership({
      sourceByEntityId: { shared: "A.md" },
      sourceEntityIdsByPath: { "A.md": ["shared"] },
    }, "B.md", ["shared"])).toThrow(/Duplicate Trail entity identity/);
  });
});
