import { describe, expect, it } from "vitest";
import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseProjectlessIssuesMarkdown,
  serializeProjectlessIssuesMarkdown,
} from "./trail-projectless-issues-codec";

describe("Projectless Issues Markdown codec", () => {
  it("round-trips projectless Workflow Issues", () => {
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1_700_000_000_000,
      id: "issue-a",
      labelIds: [],
      statusDefinitionId: "status-backlog",
      title: "Renew passport",
    };
    const markdown = serializeProjectlessIssuesMarkdown([issue]);
    const parsed = parseProjectlessIssuesMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Projectless Issues.md",
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.document?.issues).toEqual([issue]);
  });

  it("rejects Project placement facts inside the projectless carrier", () => {
    const markdown = [
      "---",
      "kind: projectless-issues",
      "---",
      "",
      "# Issues",
      "",
      "## Wrong placement",
      '<!-- data {"id":"issue-a","context":"workflow","statusDefinitionId":"status-a","projectId":"project-a","createdAt":1700000000000} -->',
      "",
    ].join("\n");
    const parsed = parseProjectlessIssuesMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Collections/Projectless Issues.md",
    });

    expect(parsed.document?.issues).toEqual([]);
    expect(parsed.issues.some((issue) => issue.message.includes("projectId must be absent"))).toBe(true);
  });
});
