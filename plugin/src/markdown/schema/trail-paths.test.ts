import { describe, expect, it } from "vitest";
import {
  TRAIL_CYCLES_PATH,
  TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE,
  TRAIL_TRIAGE_PATH,
  TRAIL_WEEKLY_UPDATE_PATH,
  createTrailSequencedEntityPath,
  isTrailDomainMarkdownPath,
  isTrailInitiativeMarkdownPath,
  isTrailProjectMarkdownPath,
  isTrailUtilityPath,
  readTrailEntityFileSequence,
} from "./trail-paths";

describe("Trail path authority", () => {
  it("keeps Domain singleton and utility paths distinct", () => {
    expect(isTrailDomainMarkdownPath(TRAIL_TRIAGE_PATH)).toBe(true);
    expect(isTrailDomainMarkdownPath(TRAIL_CYCLES_PATH)).toBe(true);
    expect(isTrailDomainMarkdownPath(TRAIL_WEEKLY_UPDATE_PATH)).toBe(false);
    expect(isTrailUtilityPath(TRAIL_WEEKLY_UPDATE_PATH)).toBe(true);
  });

  it("recognizes only direct Initiative and Project Markdown children", () => {
    expect(isTrailInitiativeMarkdownPath("Trail/Initiatives/0001 Goal.md")).toBe(true);
    expect(isTrailProjectMarkdownPath("Trail/Projects/0001 Project.md")).toBe(true);
    expect(isTrailProjectMarkdownPath("Trail/Projects/Nested/0001 Project.md")).toBe(false);
  });

  it("reserves physical sequence 0000 for fresh-workspace Project bootstrap", () => {
    expect(createTrailSequencedEntityPath(
      "Trail/Projects",
      TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE,
      "Standalone",
      "Project",
    )).toBe("Trail/Projects/0000 Standalone.md");
    expect(readTrailEntityFileSequence("0000 Standalone.md")).toBe(0);
  });

  it("creates deterministic sequenced paths without turning sequence into identity", () => {
    expect(createTrailSequencedEntityPath("Trail/Projects", 42, "A/B: C")).toBe(
      "Trail/Projects/0042 A-B- C.md",
    );
    expect(readTrailEntityFileSequence("0042 A-B- C.md")).toBe(42);
  });
});
