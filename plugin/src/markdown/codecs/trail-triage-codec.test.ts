import { describe, expect, it } from "vitest";

import { TRAIL_TRIAGE_EMPTY_MARKDOWN } from "../schema/trail-bootstrap-markdown";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  serializeTriageIssue,
  TriageMarkdownMutationError,
  updateTriageIssueInMarkdown,
  type TrailYamlParser,
} from "./trail-triage-codec";

const FILE_PATH = "Trail/Collections/Triage.md";
const DUE = 1_786_464_000_000;

const parseYaml: TrailYamlParser = (yaml) => {
  const result: Record<string, string> = {};
  for (const line of yaml.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim() === "") continue;
    const match = /^([A-Za-z0-9_-]+):\s*["']?([^"']+?)["']?\s*$/.exec(line);
    if (!match) throw new Error("unsupported test YAML");
    result[match[1]] = match[2];
  }
  return result;
};

function parse(markdown: string) {
  return parseTriageMarkdown({ filePath: FILE_PATH, markdown, parseYaml });
}

function issueBlock(
  title: string,
  metadata: Record<string, unknown>,
  description?: string,
): string {
  return [
    `## ${title}`,
    `<!-- data ${JSON.stringify(metadata)} -->`,
    ...(description === undefined ? [] : ["", description]),
  ].join("\n");
}

describe("Triage Markdown codec", () => {
  it("parses canonical records, body Markdown, sorted Set values, and exact source ranges", () => {
    const body = "Description.\n\n### Notes\n[[Related Note]]";
    const block = issueBlock("Review new idea", {
      id: "issue-a",
      context: "triage",
      projectId: "project-a",
      milestoneId: "milestone-a",
      priority: "high",
      estimate: 3,
      due: DUE,
      labelIds: ["label-z", "label-a"],
    }, body);
    const markdown = `${TRAIL_TRIAGE_EMPTY_MARKDOWN}\n${block}\n`;
    const result = parse(markdown);
    const issue = result.contribution.issuesById["issue-a"];
    const source = result.contribution.sourceByIssueId["issue-a"];

    expect(result.issues).toEqual([]);
    expect(issue).toMatchObject({
      context: "triage",
      due: DUE,
      estimate: 3,
      id: "issue-a",
      labelIds: ["label-a", "label-z"],
      milestoneId: "milestone-a",
      priority: "high",
      projectId: "project-a",
      title: "Review new idea",
    });
    expect(issue.description).toBe(body);
    expect(markdown.slice(source.startOffset, source.endOffset)).toContain(block);
  });

  it("keeps source offsets correct across BOM and CRLF", () => {
    const markdown = [
      "\uFEFF---",
      "kind: triage",
      "---",
      "",
      "# Issues",
      "",
      "## CRLF",
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      "",
      "Body.",
      "",
    ].join("\r\n");
    const result = parse(markdown);
    const source = result.contribution.sourceByIssueId["issue-a"];

    expect(result.issues).toEqual([]);
    expect(markdown.slice(source.startOffset, source.endOffset)).toContain(
      "## CRLF\r\n",
    );
  });

  it("fails closed for invalid container structure and invalid Triage metadata", () => {
    const orphan = parse([
      "---",
      "kind: triage",
      "---",
      "",
      "Orphan paragraph.",
      "# Issues",
      "",
    ].join("\n"));
    const invalidRecord = parse([
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      issueBlock("Invalid", {
        id: "issue-a",
        context: "triage",
        statusDefinitionId: "status-a",
        createdAt: DUE,
        due: DUE,
        milestoneId: "milestone-a",
        mystery: true,
      }),
      "",
    ].join("\n"));

    expect(orphan.issues.map((issue) => issue.code)).toContain(
      "triage.structure.orphan-before-issues",
    );
    expect(invalidRecord.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "statusDefinitionId is not valid on a Triage Issue",
        "createdAt is not valid on a Triage Issue",
        "milestoneId requires projectId",
        "unknown Issue metadata field: mystery",
      ]),
    );
    expect(invalidRecord.contribution.issuesById["issue-a"]).toBeUndefined();
  });

  it("serializes canonical metadata order and stable Set order", () => {
    expect(serializeTriageIssue({
      context: "triage",
      description: "Body.",
      due: DUE,
      estimate: 2,
      id: "issue-a",
      labelIds: ["label-z", "label-a"],
      milestoneId: "milestone-a",
      priority: "urgent",
      projectId: "project-a",
      title: "Review",
    })).toBe([
      "## Review",
      '<!-- data {"id":"issue-a","context":"triage","projectId":"project-a","milestoneId":"milestone-a","priority":"urgent","estimate":2,"due":1786464000000,"labelIds":["label-a","label-z"]} -->',
      "",
      "Body.",
    ].join("\n"));
  });

  it("appends against the latest valid snapshot and rejects duplicate identity", () => {
    const external = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        due: DUE,
        id: "external",
        labelIds: [],
        title: "External",
      },
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    });
    const next = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        due: DUE + 1,
        id: "local",
        labelIds: [],
        title: "Local",
      },
      markdown: external,
      parseYaml,
    });
    const result = parse(next);

    expect(Object.keys(result.contribution.issuesById).sort()).toEqual([
      "external",
      "local",
    ]);
    expect(() => appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: result.contribution.issuesById.local,
      markdown: next,
      parseYaml,
    })).toThrow(TriageMarkdownMutationError);
  });

  it("updates guarded metadata while preserving body bytes and rejects a stale snapshot", () => {
    const body = "Body keeps  two spaces.  \n\n### Notes\n- [[Link]]";
    const original = [
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      issueBlock("Original", {
        id: "issue-a",
        context: "triage",
        due: DUE,
      }, body),
      "",
    ].join("\n");
    const expectedIssue = parse(original).contribution.issuesById["issue-a"];
    const nextIssue = {
      ...expectedIssue,
      due: DUE + 60_000,
      title: "Edited title",
    };
    const next = updateTriageIssueInMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      issue: nextIssue,
      markdown: original,
      parseYaml,
    });

    expect(parse(next).contribution.issuesById["issue-a"]).toEqual(nextIssue);
    expect(next).toContain(body);
    expect(() => updateTriageIssueInMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      issue: nextIssue,
      markdown: original.replace("## Original", "## External edit"),
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });

  it("deletes only the guarded record and refuses a missing target", () => {
    const first = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        description: "A body.",
        due: DUE,
        id: "issue-a",
        labelIds: [],
        title: "A",
      },
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    });
    const original = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        description: "B body.",
        due: DUE + 1,
        id: "issue-b",
        labelIds: [],
        title: "B",
      },
      markdown: first,
      parseYaml,
    });
    const expectedIssue = parse(original).contribution.issuesById["issue-a"];
    const next = deleteTriageIssueFromMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      markdown: original,
      parseYaml,
    });

    expect(parse(next).contribution.issuesById["issue-a"]).toBeUndefined();
    expect(parse(next).contribution.issuesById["issue-b"]?.description).toBe("B body.");
    expect(() => deleteTriageIssueFromMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "target-missing" }));
  });
});
