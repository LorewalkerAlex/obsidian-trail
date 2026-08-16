import { describe, expect, it } from "vitest";
import {
  TRAIL_BOOTSTRAP_MARKDOWN,
  TRAIL_CYCLES_EMPTY_MARKDOWN,
  TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  TRAIL_TRIAGE_EMPTY_MARKDOWN,
} from "./trail-bootstrap-markdown";
import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TRIAGE_PATH,
} from "./trail-paths";

describe("Trail bootstrap Markdown manifest", () => {
  it("contains exactly the required Domain singleton carriers", () => {
    expect(TRAIL_BOOTSTRAP_MARKDOWN.files.map((file) => file.path)).toEqual(
      TRAIL_REQUIRED_SINGLETON_PATHS,
    );
    expect(TRAIL_BOOTSTRAP_MARKDOWN.files).toEqual([
      { content: TRAIL_TRIAGE_EMPTY_MARKDOWN, path: TRAIL_TRIAGE_PATH },
      { content: TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN, path: TRAIL_PROJECTLESS_ISSUES_PATH },
      { content: TRAIL_CYCLES_EMPTY_MARKDOWN, path: TRAIL_CYCLES_PATH },
    ]);
  });
});
