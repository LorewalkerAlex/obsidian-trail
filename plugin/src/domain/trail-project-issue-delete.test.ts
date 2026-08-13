import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "./trail-issue";
import type { TrailProject } from "./trail-project";
import {
  appendWorkflowIssueToProjectMarkdown,
  serializeProjectMarkdown,
} from "./trail-project-markdown";
import { deleteWorkflowIssueFromProjectMarkdown } from "./trail-project-issue-delete";

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

const project: TrailProject = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-planned",
  title: "Accept Target",
};

const issue: TrailWorkflowIssue = {
  context: "workflow",
  createdAt: 100,
  description: "Keep this body until the record is deliberately removed.",
  id: "workflow-b",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-backlog",
  title: "Accepted capture",
};

describe("Workflow Issue Project deletion", () => {
  it("removes only the guarded Issue and preserves unrelated latest Project bytes", () => {
    const filePath = "Trail/Projects/0001 Accept Target.md";
    const base = serializeProjectMarkdown(project).replace(
      "# Milestones",
      "External Project note.\n\n# Milestones",
    );
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue,
      markdown: base,
      parseYaml,
    });

    const next = deleteWorkflowIssueFromProjectMarkdown({
      expectedIssue: issue,
      filePath,
      markdown: withIssue,
      parseYaml,
    });

    expect(next).toContain("External Project note.");
    expect(next).not.toContain("## Accepted capture");
    expect(next).not.toContain("Keep this body until the record is deliberately removed.");
  });

  it("rejects compensation when the target Issue changed after creation", () => {
    const filePath = "Trail/Projects/0001 Accept Target.md";
    const withIssue = appendWorkflowIssueToProjectMarkdown({
      expectedProject: project,
      filePath,
      issue,
      markdown: serializeProjectMarkdown(project),
      parseYaml,
    }).replace("## Accepted capture", "## External target edit");

    expect(() => deleteWorkflowIssueFromProjectMarkdown({
      expectedIssue: issue,
      filePath,
      markdown: withIssue,
      parseYaml,
    })).toThrow(expect.objectContaining({ code: "conflict" }));
  });
});
