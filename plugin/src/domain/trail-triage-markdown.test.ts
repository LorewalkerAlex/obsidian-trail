import { describe, expect, it } from "vitest";

import { TRAIL_TRIAGE_EMPTY_MARKDOWN } from "./trail-physical-schema";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  serializeTriageIssue,
  updateTriageIssueInMarkdown,
  TriageMarkdownMutationError,
  type TrailYamlParser,
} from "./trail-triage-markdown";

const FILE_PATH = "Trail/Collections/Triage.md";
const DUE = 1_786_464_000_000;

const parseYaml: TrailYamlParser = (yaml) => {
  const result: Record<string, string> = {};
  for (const line of yaml.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    const match = /^([A-Za-z0-9_-]+):\s*["']?([^"']+?)["']?\s*$/.exec(line);
    if (!match) {
      throw new Error("unsupported test YAML");
    }
    result[match[1]] = match[2];
  }
  return result;
};

function parse(markdown: string) {
  return parseTriageMarkdown({
    filePath: FILE_PATH,
    markdown,
    parseYaml,
  });
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

describe("Formal Triage Markdown", () => {
  it("parses the canonical empty singleton", () => {
    const result = parse(TRAIL_TRIAGE_EMPTY_MARKDOWN);

    expect(result.issues).toEqual([]);
    expect(result.contribution.issuesById).toEqual({});
  });

  it("parses Triage Issue facts, body Markdown, and exact source ranges", () => {
    const block = issueBlock(
      "Review new idea",
      {
        id: "issue-a",
        context: "triage",
        projectId: "project-a",
        milestoneId: "milestone-a",
        priority: "high",
        estimate: 3,
        due: DUE,
        labelIds: ["label-z", "label-a"],
      },
      [
        "Description.",
        "",
        "### Notes",
        "[[Related Note]]",
        "",
        "```md",
        "## Not a record",
        '<!-- data {"id":"fake","context":"triage","due":1} -->',
        "```",
      ].join("\n"),
    );
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
    expect(issue.description).toContain("### Notes");
    expect(issue.description).toContain("## Not a record");
    expect(markdown.slice(source.startOffset, source.endOffset)).toContain(block);
    expect(markdown.slice(source.markerStartOffset, source.markerEndOffset)).toBe(
      '<!-- data {"id":"issue-a","context":"triage","projectId":"project-a","milestoneId":"milestone-a","priority":"high","estimate":3,"due":1786464000000,"labelIds":["label-z","label-a"]} -->',
    );
  });

  it("keeps offsets correct across BOM and CRLF", () => {
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

  it("rejects invalid container structure instead of guessing", () => {
    const invalidKind = parse([
      "---",
      "kind: projectless-issues",
      "---",
      "",
      "# Issues",
      "",
    ].join("\n"));
    const orphan = parse([
      "---",
      "kind: triage",
      "---",
      "",
      "Orphan paragraph.",
      "# Issues",
      "",
    ].join("\n"));
    const extraH1 = parse([
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      "# Unexpected",
      "",
    ].join("\n"));

    expect(invalidKind.issues.map((issue) => issue.code)).toContain(
      "triage.frontmatter.invalid",
    );
    expect(orphan.issues.map((issue) => issue.code)).toContain(
      "triage.structure.orphan-before-issues",
    );
    expect(extraH1.issues.map((issue) => issue.code)).toContain(
      "triage.structure.unexpected-h1",
    );
  });

  it("rejects misplaced, missing, and duplicate metadata markers", () => {
    const misplaced = parse([
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      "## Misplaced",
      "Paragraph first.",
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      "",
    ].join("\n"));
    const missing = parse([
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      "## Missing",
      "Body without metadata.",
      "",
    ].join("\n"));
    const duplicate = parse([
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      issueBlock("Duplicate", {
        id: "issue-a",
        context: "triage",
        due: DUE,
      }),
      '<!-- data {"id":"issue-a","context":"triage","due":1786464000000} -->',
      "",
    ].join("\n"));

    expect(misplaced.issues.map((issue) => issue.code)).toEqual([
      "triage.record.marker-position",
    ]);
    expect(missing.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "triage.record.marker-position",
        "triage.record.marker-count",
      ]),
    );
    expect(duplicate.issues.map((issue) => issue.code)).toContain(
      "triage.record.marker-count",
    );
  });

  it("rejects workflow-only, unknown, and internally inconsistent metadata", () => {
    const markdown = [
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      issueBlock("Invalid", {
        id: "issue-a",
        context: "triage",
        statusDefinitionId: "status-a",
        due: DUE,
        createdAt: DUE,
        milestoneId: "milestone-a",
        mystery: true,
      }),
      "",
    ].join("\n");
    const result = parse(markdown);
    const messages = result.issues.map((issue) => issue.message);

    expect(messages).toContain("statusDefinitionId is not valid on a Triage Issue");
    expect(messages).toContain("createdAt is not valid on a Triage Issue");
    expect(messages).toContain("milestoneId requires projectId");
    expect(messages).toContain("unknown Issue metadata field: mystery");
    expect(result.contribution.issuesById["issue-a"]).toBeUndefined();
  });

  it("isolates duplicate IDs instead of choosing first or last", () => {
    const markdown = [
      TRAIL_TRIAGE_EMPTY_MARKDOWN.trimEnd(),
      "",
      issueBlock("First", { id: "same", context: "triage", due: DUE }),
      "",
      issueBlock("Second", { id: "same", context: "triage", due: DUE + 1 }),
      "",
    ].join("\n");
    const result = parse(markdown);

    expect(result.issues.map((issue) => issue.code)).toContain(
      "triage.record.id-duplicate",
    );
    expect(result.contribution.issuesById.same).toBeUndefined();
  });

  it("serializes canonical metadata order and stable Set order", () => {
    const serialized = serializeTriageIssue({
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
    });

    expect(serialized).toBe([
      "## Review",
      '<!-- data {"id":"issue-a","context":"triage","projectId":"project-a","milestoneId":"milestone-a","priority":"urgent","estimate":2,"due":1786464000000,"labelIds":["label-a","label-z"]} -->',
      "",
      "Body.",
    ].join("\n"));
  });

  it("appends against the latest valid snapshot and verifies the result", () => {
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

    expect(result.issues).toEqual([]);
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

  it("updates heading and metadata while preserving the existing body bytes", () => {
    const body = [
      "Body keeps  two spaces.  ",
      "",
      "### Notes",
      "- [[Link]]",
    ].join("\n");
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
    const result = parse(next);

    expect(result.issues).toEqual([]);
    expect(result.contribution.issuesById["issue-a"]).toEqual(nextIssue);
    expect(next).toContain("## Edited title");
    expect(next).toContain(`due":${DUE + 60_000}`);
    expect(next).toContain(body);
    expect(next.slice(next.indexOf(body), next.indexOf(body) + body.length)).toBe(body);
  });

  it("refuses an in-place update when the latest source no longer matches the planned issue", () => {
    const original = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        due: DUE,
        id: "issue-a",
        labelIds: [],
        title: "Original",
      },
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    });
    const expectedIssue = parse(original).contribution.issuesById["issue-a"];
    const externallyChanged = original.replace("## Original", "## External edit");

    expect(() => updateTriageIssueInMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      issue: { ...expectedIssue, title: "Local edit" },
      markdown: externallyChanged,
      parseYaml,
    })).toThrow("Triage Issue changed before mutation");
  });

  it("deletes exactly the guarded target record while preserving its sibling", () => {
    const first = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        description: "Keep this body only with A.",
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
        description: "Sibling body.",
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
    const result = parse(next);

    expect(result.issues).toEqual([]);
    expect(result.contribution.issuesById["issue-a"]).toBeUndefined();
    expect(result.contribution.issuesById["issue-b"]?.description).toBe("Sibling body.");
    expect(next).not.toContain("Keep this body only with A.");
    expect(next).toContain("Sibling body.");
  });

  it("refuses delete when the target disappeared from the latest valid source", () => {
    const original = appendTriageIssueToMarkdown({
      filePath: FILE_PATH,
      issue: {
        context: "triage",
        due: DUE,
        id: "issue-a",
        labelIds: [],
        title: "A",
      },
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    });
    const expectedIssue = parse(original).contribution.issuesById["issue-a"];

    expect(() => deleteTriageIssueFromMarkdown({
      expectedIssue,
      filePath: FILE_PATH,
      markdown: TRAIL_TRIAGE_EMPTY_MARKDOWN,
      parseYaml,
    })).toThrow("Triage Issue is missing");
  });

});
