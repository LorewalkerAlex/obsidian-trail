import { describe, expect, it } from "vitest";

import {
  createTrailSequencedEntityPath,
  isTrailInitiativeMarkdownPath,
  isTrailProjectMarkdownPath,
  isTrailProjectsScopePath,
  readTrailEntityFileSequence,
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_COLLECTIONS_PATH,
  TRAIL_CYCLES_PATH,
  TRAIL_INITIATIVES_PATH,
  TRAIL_MANAGED_ROOT,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_PROJECTS_PATH,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TOP_LEVEL_DIRECTORY_PATHS,
  TRAIL_TRIAGE_PATH,
} from "./trail-paths";

describe("Trail path authority", () => {
  it("owns the complete managed layout", () => {
    expect(TRAIL_MANAGED_ROOT).toBe("Trail");
    expect(TRAIL_TOP_LEVEL_DIRECTORY_PATHS).toEqual([
      "Trail/Initiatives",
      "Trail/Projects",
      "Trail/Collections",
    ]);
    expect(TRAIL_BOOTSTRAP_DIRECTORIES).toEqual([
      "Trail",
      "Trail/Initiatives",
      "Trail/Projects",
      "Trail/Collections",
    ]);
    expect(TRAIL_REQUIRED_SINGLETON_PATHS).toEqual([
      "Trail/Collections/Triage.md",
      "Trail/Collections/Projectless Issues.md",
      "Trail/Collections/Cycles.md",
    ]);
    expect(TRAIL_INITIATIVES_PATH).toBe("Trail/Initiatives");
    expect(TRAIL_PROJECTS_PATH).toBe("Trail/Projects");
    expect(TRAIL_COLLECTIONS_PATH).toBe("Trail/Collections");
    expect(TRAIL_TRIAGE_PATH).toBe("Trail/Collections/Triage.md");
    expect(TRAIL_PROJECTLESS_ISSUES_PATH).toBe(
      "Trail/Collections/Projectless Issues.md",
    );
    expect(TRAIL_CYCLES_PATH).toBe("Trail/Collections/Cycles.md");
  });

  it("classifies managed file-backed source paths without accepting nested files", () => {
    expect(isTrailInitiativeMarkdownPath("Trail/Initiatives/0001 Alpha.md")).toBe(true);
    expect(isTrailInitiativeMarkdownPath("Trail/Initiatives/Nested/0001 Alpha.md")).toBe(false);
    expect(isTrailProjectMarkdownPath("Trail/Projects/0001 Alpha.md")).toBe(true);
    expect(isTrailProjectMarkdownPath("Trail/Projects/Nested/0001 Alpha.md")).toBe(false);
    expect(isTrailProjectsScopePath("Trail/Projects")).toBe(true);
    expect(isTrailProjectsScopePath("Trail/Projects/0001 Alpha.md")).toBe(true);
    expect(isTrailProjectsScopePath("Trail/Projectless")).toBe(false);
  });

  it("owns the shared four-digit readable filename projection", () => {
    expect(readTrailEntityFileSequence("0042 Trail Persistence.md")).toBe(42);
    expect(readTrailEntityFileSequence("Trail Persistence.md")).toBeUndefined();
    expect(createTrailSequencedEntityPath(
      TRAIL_PROJECTS_PATH,
      42,
      'Trail: Persistence / Design?',
    )).toBe("Trail/Projects/0042 Trail- Persistence - Design-.md");
  });
});
