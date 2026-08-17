import { describe, expect, it } from "vitest";
import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
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
    expect(isTrailDomainMarkdownPath(TRAIL_PROJECTLESS_ISSUES_PATH)).toBe(true);
    expect(isTrailDomainMarkdownPath(TRAIL_CYCLES_PATH)).toBe(true);
    expect(isTrailDomainMarkdownPath(TRAIL_WEEKLY_UPDATE_PATH)).toBe(false);
    expect(isTrailUtilityPath(TRAIL_WEEKLY_UPDATE_PATH)).toBe(true);
  });

  it("recognizes only direct Initiative and Project Markdown children", () => {
    expect(isTrailInitiativeMarkdownPath("Trail/Initiatives/0001 Goal.md")).toBe(true);
    expect(isTrailProjectMarkdownPath("Trail/Projects/0001 Project.md")).toBe(true);
    expect(isTrailProjectMarkdownPath("Trail/Projects/Nested/0001 Project.md")).toBe(false);
  });

  it("creates deterministic sequenced paths without turning sequence into identity", () => {
    expect(createTrailSequencedEntityPath("Trail/Projects", 42, "A/B: C")).toBe(
      "Trail/Projects/0042 A-B- C.md",
    );
    expect(readTrailEntityFileSequence("0042 A-B- C.md")).toBe(42);
  });
});
