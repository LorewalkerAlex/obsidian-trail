import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import {
  appendWorkflowIssueToProjectMarkdown,
  deleteWorkflowIssueFromProjectMarkdown,
  parseProjectMarkdown,
  serializePhysicalMilestoneRecord,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
} from "./trail-project-codec";

function parseYaml(yaml: string): unknown {
  const value: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    value[key] = key === "id" ? JSON.parse(raw) : raw;
  }
  return value;
}

const filePath = "Trail/Projects/0001 Workflow Entry.md";
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
  return parseProjectMarkdown({ filePath, markdown, parseYaml });
}

describe("Project Markdown codec", () => {
  it("round-trips the canonical Project shape", () => {
    const markdown = serializeProjectMarkdown(project);
    const result = parse(markdown);

    expect(result.issues).toEqual([]);
    expect(result.contribution?.project).toEqual(project);
    expect(result.contribution?.issuesById).toEqual({});
    expect(markdown).toContain("# Project");
    expect(markdown).toContain("# Milestones");
    expect(markdown).toContain("# Issues");
  });

  it("appends against the latest Project body and rejects a stale Project snapshot", () => {
    const externallyEdited = serializeProjectMarkdown(project).replace(
      "# Milestones",
      "Project body from an external edit.\n\n# Milestones",
    );
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue,
      markdown: externallyEdited,
      parseYaml,
    });

    expect(withIssue).toContain("Project body from an external edit.");
    expect(parse(withIssue).contribution?.issuesById[issue.id]).toEqual(issue);

    const statusChanged = serializeProjectMarkdown({
      ...project,
      statusDefinitionId: "project-completed",
    });
    expect(() => appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue,
      markdown: statusChanged,
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });

  it("updates Issue metadata while preserving body bytes and rejects stale Issue state", () => {
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue: {
        ...issue,
        description: "Keep **this** body.\n\n### Notes\n- exact bytes",
      },
      markdown: serializeProjectMarkdown(project),
      parseYaml,
    });
    const current = parse(withIssue).contribution?.issuesById[issue.id];
    if (current === undefined) throw new Error("fixture parse failed");

    const next = updateWorkflowIssueInProjectMarkdown({
      expectedIssue: current,
      filePath,
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
    expect(() => updateWorkflowIssueInProjectMarkdown({
      expectedIssue: current,
      filePath,
      issue: { ...current, statusDefinitionId: "issue-started" },
      markdown: withIssue.replace("## Implement workflow", "## External change"),
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });

  it("deletes only the guarded Issue and preserves unrelated latest Project bytes", () => {
    const base = serializeProjectMarkdown(project).replace(
      "# Milestones",
      "External Project note.\n\n# Milestones",
    );
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue: {
        ...issue,
        description: "Remove this body with the Issue.",
      },
      markdown: base,
      parseYaml,
    });
    const expectedIssue = parse(withIssue).contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("fixture parse failed");

    const next = deleteWorkflowIssueFromProjectMarkdown({
      expectedIssue,
      filePath,
      markdown: withIssue,
      parseYaml,
    });

    expect(next).toContain("External Project note.");
    expect(next).not.toContain("## Implement workflow");
    expect(() => deleteWorkflowIssueFromProjectMarkdown({
      expectedIssue,
      filePath,
      markdown: withIssue.replace("## Implement workflow", "## External target edit"),
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });

  it("parses canonical Milestone physical records without enabling Milestone behavior", () => {
    const milestone = serializePhysicalMilestoneRecord({
      description: "Physical checkpoint.",
      due: 200,
      id: "milestone-a",
      projectId: project.id,
      title: "Phase 1",
    });
    const markdown = serializeProjectMarkdown(project).replace(
      "# Milestones\n\n# Issues",
      `# Milestones\n\n${milestone}\n\n# Issues`,
    );

    expect(parse(markdown).physicalMilestonesById?.["milestone-a"]).toEqual({
      description: "Physical checkpoint.",
      due: 200,
      id: "milestone-a",
      projectId: project.id,
      title: "Phase 1",
    });
  });
});
