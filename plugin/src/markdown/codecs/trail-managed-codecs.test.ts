import { describe, expect, it } from "vitest";

import {
  TRAIL_CYCLES_EMPTY_MARKDOWN,
  TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  TRAIL_TRIAGE_EMPTY_MARKDOWN,
} from "../schema/trail-bootstrap-markdown";
import {
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "../schema/trail-paths";
import { validateFormalManagedMarkdown } from "./trail-managed-codecs";

function parseYaml(yaml: string): unknown {
  const line = yaml.trim();
  const separator = line.indexOf(":");
  if (separator < 0) {
    throw new Error("invalid YAML fixture");
  }
  return {
    [line.slice(0, separator).trim()]: line.slice(separator + 1).trim(),
  };
}

describe("Formal managed Markdown validator", () => {
  it("accepts the three canonical singleton bootstrap files", () => {
    expect(validateFormalManagedMarkdown(
      TRAIL_TRIAGE_PATH,
      TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    )).toEqual([]);
    expect(validateFormalManagedMarkdown(
      TRAIL_PROJECTLESS_ISSUES_PATH,
      TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
      parseYaml,
    )).toEqual([]);
    expect(validateFormalManagedMarkdown(
      TRAIL_CYCLES_PATH,
      TRAIL_CYCLES_EMPTY_MARKDOWN,
      parseYaml,
    )).toEqual([]);
  });

  it("routes Triage through the production codec and rejects the wrong singleton kind", () => {
    const triage = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Captured",
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      "",
    ].join("\n");
    const wrongKind = TRAIL_CYCLES_EMPTY_MARKDOWN.replace(
      "kind: cycles",
      "kind: triage",
    );

    expect(validateFormalManagedMarkdown(
      TRAIL_TRIAGE_PATH,
      triage,
      parseYaml,
    )).toEqual([]);
    expect(validateFormalManagedMarkdown(
      TRAIL_CYCLES_PATH,
      wrongKind,
      parseYaml,
    )).not.toEqual([]);
  });

  it("accepts BOM and CRLF and fails closed for unsupported singleton paths", () => {
    const markdown = `\uFEFF${TRAIL_CYCLES_EMPTY_MARKDOWN.replace(/\n/g, "\r\n")}`;

    expect(validateFormalManagedMarkdown(
      TRAIL_CYCLES_PATH,
      markdown,
      parseYaml,
    )).toEqual([]);
    expect(validateFormalManagedMarkdown(
      "Trail/Collections/Unknown.md",
      markdown,
      parseYaml,
    )).toEqual([
      "unsupported Formal singleton path: Trail/Collections/Unknown.md",
    ]);
  });
});
