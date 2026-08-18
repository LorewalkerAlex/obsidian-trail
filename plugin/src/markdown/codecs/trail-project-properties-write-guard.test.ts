import { describe, expect, it } from "vitest";

import type { TrailProject, TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { serializeProjectRecord, serializeProjectWorkflowIssue } from "./trail-project-codec";

const project: TrailProject = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};

const issue: TrailWorkflowIssue = {
  context: "workflow",
  createdAt: 1,
  id: "issue-a",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-unstarted",
  title: "Issue A",
};

describe("managed planning-property Markdown write guards", () => {
  it.each(["# New Root", "## New Record"])(
    "rejects Project descriptions that create managed structure: %s",
    (description) => {
      expect(() => serializeProjectRecord({ ...project, description })).toThrow(
        "Project description must not contain root H1 or H2 headings",
      );
    },
  );

  it("allows lower headings and fenced examples in Project descriptions", () => {
    const description = "### Notes\n\n```md\n## Example only\n```";
    expect(serializeProjectRecord({ ...project, description })).toContain(description);
  });

  it("explicitly rejects root H1 in Workflow Issue descriptions", () => {
    expect(() => serializeProjectWorkflowIssue(
      { ...issue, description: "# Escaping Issue body" },
      project.id,
    )).toThrow("Workflow Issue description must not contain root H1 or H2 headings");
  });
});
