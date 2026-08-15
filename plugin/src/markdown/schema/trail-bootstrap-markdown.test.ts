import { describe, expect, it } from "vitest";

import {
  TRAIL_BOOTSTRAP_FILES,
  TRAIL_BOOTSTRAP_MARKDOWN,
  TRAIL_CYCLES_EMPTY_MARKDOWN,
  TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  TRAIL_TRIAGE_EMPTY_MARKDOWN,
} from "./trail-bootstrap-markdown";
import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_REQUIRED_SINGLETON_PATHS,
} from "./trail-paths";

describe("Trail bootstrap Markdown manifest", () => {
  it("creates exactly the required singleton sources", () => {
    expect(TRAIL_BOOTSTRAP_FILES.map((file) => file.path)).toEqual(
      TRAIL_REQUIRED_SINGLETON_PATHS,
    );
    expect(TRAIL_BOOTSTRAP_MARKDOWN.directories).toEqual(
      TRAIL_BOOTSTRAP_DIRECTORIES,
    );
    expect(TRAIL_BOOTSTRAP_MARKDOWN.files).toBe(TRAIL_BOOTSTRAP_FILES);
  });

  it("keeps bootstrap templates owned outside the physical schema registry", () => {
    expect(TRAIL_TRIAGE_EMPTY_MARKDOWN).toContain("kind: triage");
    expect(TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN).toContain(
      "kind: projectless-issues",
    );
    expect(TRAIL_CYCLES_EMPTY_MARKDOWN).toContain("kind: cycles");
  });
});
