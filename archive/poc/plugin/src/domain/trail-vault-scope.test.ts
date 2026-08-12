import { describe, expect, it } from "vitest";

import {
  isTrailDataEventPath,
  isTrailManagedMarkdownPath,
} from "./trail-vault-reader";

describe("Trail Vault path scope", () => {
  it("recognizes direct managed Markdown files", () => {
    expect(
      isTrailManagedMarkdownPath(
        "Trail/Areas/Work/Area.md",
      ),
    ).toBe(true);
    expect(
      isTrailManagedMarkdownPath(
        "Trail/Areas/Work/Trail POC.md",
      ),
    ).toBe(true);
  });

  it("recognizes folder events that can change managed data", () => {
    expect(isTrailDataEventPath("Trail")).toBe(true);
    expect(isTrailDataEventPath("Trail/Areas")).toBe(true);
    expect(
      isTrailDataEventPath("Trail/Areas/Work"),
    ).toBe(true);
  });

  it("ignores unrelated, nested, and non-Markdown paths", () => {
    const ignoredPaths = [
      "docs/technical-design.md",
      "Trail/Fleeting/Idea.md",
      "Trail/Areas/Work/Nested/Ignored.md",
      "Trail/Areas/Work/Project.txt",
    ];

    for (const path of ignoredPaths) {
      expect(isTrailManagedMarkdownPath(path)).toBe(false);
      expect(isTrailDataEventPath(path)).toBe(false);
    }
  });
});
