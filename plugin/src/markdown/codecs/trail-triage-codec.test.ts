import { describe, expect, it } from "vitest";
import type { TrailTriageIssue } from "../../domain/model/trail-entities";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseTriageMarkdown,
  serializeTriageMarkdown,
} from "./trail-triage-codec";

describe("Triage Markdown codec", () => {
  it("round-trips Triage Issues with canonical set ordering", () => {
    const issue: TrailTriageIssue = {
      context: "triage",
      description: "Review later.",
      due: 1_800_000_000_000,
      estimate: "medium",
      id: "issue-a",
      labelIds: ["label-z", "label-a"],
      title: "Capture",
    };
    const markdown = serializeTriageMarkdown([issue]);
    const parsed = parseTriageMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(markdown).toContain('"estimate":"medium"');
    expect(parsed.issues).toEqual([]);
    expect(parsed.document?.issues).toEqual([{ ...issue, labelIds: ["label-a", "label-z"] }]);
    expect(parsed.document?.locationsByIssueId["issue-a"]).toBeDefined();
  });

  it("preserves a valid contribution while reporting an isolated invalid record", () => {
    const markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Good",
      '<!-- data {"id":"good","context":"triage","due":1800000000000} -->',
      "",
      "## Bad",
      '<!-- data {"id":"bad","context":"workflow","due":1800000000000} -->',
      "",
    ].join("\n");
    const parsed = parseTriageMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(parsed.document?.issues.map((issue) => issue.id)).toEqual(["good"]);
    expect(parsed.issues.some((issue) => issue.entityId === "bad" || issue.message.includes("triage"))).toBe(true);
  });

  it("rejects Project and Milestone ownership metadata on a Triage Issue", () => {
    const markdown = [
      "---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## Invalid",
      '<!-- data {"id":"invalid","context":"triage","projectId":"project-a","milestoneId":"milestone-a","due":1800000000000} -->',
      "",
    ].join("\n");
    const parsed = parseTriageMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Triage.md",
    });

    expect(parsed.document?.issues).toEqual([]);
    expect(parsed.issues.map(({ message }) => message)).toEqual(expect.arrayContaining([
      "projectId is not valid on a Triage Issue",
      "milestoneId is not valid on a Triage Issue",
    ]));
  });
});
