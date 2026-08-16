import { describe, expect, it } from "vitest";

import {
  allocateTrailFileBackedEntityPath,
  projectTrailRenamedFileBackedPath,
} from "./trail-file-backed-path-allocator";

describe("Trail file-backed path allocator", () => {
  it("allocates max existing sequence + 1 without reusing historical gaps", async () => {
    const path = await allocateTrailFileBackedEntityPath({
      list: async () => [
        { kind: "file", name: "0001 A.md", path: "Trail/Projects/0001 A.md" },
        { kind: "file", name: "0003 C.md", path: "Trail/Projects/0003 C.md" },
      ],
    }, "project", "Project B");
    expect(path).toBe("Trail/Projects/0004 Project B.md");
  });

  it("keeps the physical sequence stable across readable-title rename", () => {
    expect(projectTrailRenamedFileBackedPath(
      "Trail/Projects/0042 Old title.md",
      "project",
      "New title",
    )).toBe("Trail/Projects/0042 New title.md");
  });
});
