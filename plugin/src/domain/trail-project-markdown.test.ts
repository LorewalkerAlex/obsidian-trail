import { describe, expect, it } from "vitest";

import type { TrailProject } from "./trail-project";
import {
  appendWorkflowIssueToProjectMarkdown,
  parseProjectMarkdown,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
} from "./trail-project-markdown";
import type { TrailWorkflowIssue } from "./trail-issue";

function parseYaml(yaml: string): unknown {
  const value: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    if (key === "id") {
      value[key] = JSON.parse(raw);
    } else if (raw !== "") {
      value[key] = raw;
    }
  }
  return value;
}

const project: TrailProject = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-planned",
  title: "Workflow Entry",
};

const issue: TrailWorkflowIssue = {
  context: "workflow",
  createdAt: 100,
  id: "issue-a",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-backlog",
  title: "Implement workflow",
};

function parse(markdown: string) {
  return parseProjectMarkdown({
    filePath: "Trail/Projects/0001 Workflow Entry.md",
    markdown,
    parseYaml,
  });
}

describe("Formal Project Markdown", () => {
  it("round-trips a Project with the canonical three-section shape", () => {
    const markdown = serializeProjectMarkdown(project);
    const result = parse(markdown);

    expect(result.issues).toEqual([]);
    expect(result.contribution?.project).toEqual(project);
    expect(result.contribution?.issuesById).toEqual({});
    expect(markdown).toContain("# Project");
    expect(markdown).toContain("# Milestones");
    expect(markdown).toContain("# Issues");
  });

  it("appends a Workflow Issue and preserves the Project canonical facts", () => {
    const markdown = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue,
      markdown: serializeProjectMarkdown(project),
      parseYaml,
    });
    const result = parse(markdown);

    expect(result.issues).toEqual([]);
    expect(result.contribution?.project).toEqual(project);
    expect(result.contribution?.issuesById[issue.id]).toEqual(issue);
  });

  it("preserves unrelated external Project edits but rejects a stale lifecycle status", () => {
    const externallyEdited = serializeProjectMarkdown(project).replace(
      "# Milestones",
      "Project body from an external edit.\n\n# Milestones",
    );
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue,
      markdown: externallyEdited,
      parseYaml,
    });

    expect(withIssue).toContain("Project body from an external edit.");
    expect(parse(withIssue).contribution?.project.description).toBe(
      "Project body from an external edit.",
    );

    const statusChanged = serializeProjectMarkdown({
      ...project,
      statusDefinitionId: "project-completed",
    });
    expect(() => appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue,
      markdown: statusChanged,
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });

  it("updates Workflow metadata against the expected snapshot and preserves body bytes", () => {
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue: { ...issue, description: "Keep **this** body.\n\n### Notes\n- exact bytes" },
      markdown: serializeProjectMarkdown(project),
      parseYaml,
    });
    const current = parse(withIssue).contribution?.issuesById[issue.id];
    if (current === undefined) throw new Error("fixture parse failed");

    const next = updateWorkflowIssueInProjectMarkdown({
      expectedIssue: current,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue: {
        ...current,
        firstStartedAt: 200,
        statusDefinitionId: "issue-started",
      },
      markdown: withIssue,
      parseYaml,
    });

    expect(next).toContain("Keep **this** body.\n\n### Notes\n- exact bytes");
    expect(parse(next).contribution?.issuesById[issue.id]).toMatchObject({
      firstStartedAt: 200,
      statusDefinitionId: "issue-started",
    });
  });

  it("rejects a stale expected Issue instead of overwriting an external edit", () => {
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue,
      markdown: serializeProjectMarkdown(project),
      parseYaml,
    });
    const externallyEdited = withIssue.replace(
      "## Implement workflow",
      "## External change",
    );

    expect(() => updateWorkflowIssueInProjectMarkdown({
      expectedIssue: issue,
      filePath: "Trail/Projects/0001 Workflow Entry.md",
      issue: { ...issue, statusDefinitionId: "issue-started" },
      markdown: externallyEdited,
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));

    expect(externallyEdited).toContain("## External change");
  });

  it("reports unsupported Milestone content instead of guessing its grammar", () => {
    const markdown = serializeProjectMarkdown(project).replace(
      "# Milestones\n\n# Issues",
      "# Milestones\n\n## Phase 1\n<!-- data {\"id\":\"milestone-a\",\"projectId\":\"project-a\"} -->\n\n# Issues",
    );

    expect(parse(markdown).issues.map((entry) => entry.code)).toContain(
      "project.milestones.unsupported",
    );
  });
});
