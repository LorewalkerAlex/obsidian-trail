import { describe, expect, it } from "vitest";

import { createTrailProjectPathAllocator } from "./trail-file-backed-entity-path-allocator";

describe("Trail Project path allocator", () => {
  it("allocates max sequence plus one and sanitizes the readable suffix", async () => {
    const allocate = createTrailProjectPathAllocator(async () => [
      { kind: "file", name: "0002 Older.md", path: "Trail/Projects/0002 Older.md" },
      { kind: "file", name: "0007 Latest.md", path: "Trail/Projects/0007 Latest.md" },
      { kind: "file", name: "notes.txt", path: "Trail/Projects/notes.txt" },
    ]);
    await expect(allocate({
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "status-unstarted",
      title: "Plan: 2026 / Home",
    })).resolves.toBe("Trail/Projects/0008 Plan- 2026 - Home.md");
  });
});
