import { describe, expect, it } from "vitest";

import {
  TRAIL_CYCLES_EMPTY_MARKDOWN,
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_EMPTY_MARKDOWN,
  TRAIL_TRIAGE_PATH,
} from "./trail-physical-schema";
import { validateFormalManagedMarkdown } from "./trail-managed-markdown";

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

describe("Current Formal managed Markdown validator", () => {
  it("accepts all three canonical bootstrap singleton files", () => {
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

  it("routes Triage through the production Triage grammar", () => {
    const markdown = [
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

    expect(validateFormalManagedMarkdown(
      TRAIL_TRIAGE_PATH,
      markdown,
      parseYaml,
    )).toEqual([]);
  });

  it("rejects wrong container kinds and future records that are not implemented yet", () => {
    const wrongKind = TRAIL_CYCLES_EMPTY_MARKDOWN.replace("kind: cycles", "kind: triage");
    const unsupportedProjectlessRecord = `${TRAIL_PROJECTLESS_ISSUES_EMPTY_MARKDOWN}\n## Not supported yet\n`;

    expect(validateFormalManagedMarkdown(
      TRAIL_CYCLES_PATH,
      wrongKind,
      parseYaml,
    )).not.toEqual([]);
    expect(validateFormalManagedMarkdown(
      TRAIL_PROJECTLESS_ISSUES_PATH,
      unsupportedProjectlessRecord,
      parseYaml,
    )).not.toEqual([]);
  });

  it("accepts BOM and CRLF around a currently empty container", () => {
    const markdown = `\uFEFF${TRAIL_CYCLES_EMPTY_MARKDOWN.replace(/\n/g, "\r\n")}`;

    expect(validateFormalManagedMarkdown(
      TRAIL_CYCLES_PATH,
      markdown,
      parseYaml,
    )).toEqual([]);
  });
});
