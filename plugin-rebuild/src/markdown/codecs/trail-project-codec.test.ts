import { describe, expect, it } from "vitest";
import type {
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseProjectMarkdown,
  serializeProjectMarkdown,
} from "./trail-project-codec";

function projectFixture(): {
  readonly issue: TrailWorkflowIssue;
  readonly milestone: TrailMilestone;
  readonly project: TrailProject;
} {
  const project: TrailProject = {
    id: "project-a",
    labelIds: ["label-work"],
    statusDefinitionId: "project-started",
    title: "Trail Rebuild",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Persistence foundation",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1_700_000_000_000,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Build codecs",
  };
  return { issue, milestone, project };
}

describe("Project Markdown codec", () => {
  it("round-trips Project, Milestone, and Workflow Issue records", () => {
    const fixture = projectFixture();
    const markdown = serializeProjectMarkdown({
      issues: [fixture.issue],
      milestones: [fixture.milestone],
      project: fixture.project,
    });
    const parsed = parseProjectMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Projects/0001 Trail Rebuild.md",
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.document?.project).toEqual(fixture.project);
    expect(parsed.document?.milestones).toEqual([fixture.milestone]);
    expect(parsed.document?.issues).toEqual([fixture.issue]);
    expect(parsed.document?.locationsByIssueId[fixture.issue.id]).toBeDefined();
  });

  it("reports placement mismatch without rewriting the canonical relation", () => {
    const fixture = projectFixture();
    const markdown = serializeProjectMarkdown({
      issues: [fixture.issue],
      milestones: [fixture.milestone],
      project: fixture.project,
    }).replace(
      '"id":"issue-a","context":"workflow","statusDefinitionId":"issue-started","projectId":"project-a"',
      '"id":"issue-a","context":"workflow","statusDefinitionId":"issue-started","projectId":"project-b"',
    );
    const parsed = parseProjectMarkdown({
      markdown,
      parseYaml: parseTrailTestYaml,
      sourcePath: "Trail/Projects/0001 Trail Rebuild.md",
    });

    expect(parsed.document?.project.id).toBe("project-a");
    expect(parsed.document?.issues).toEqual([]);
    expect(parsed.issues.some((issue) => issue.message.includes("must match the owning Project file"))).toBe(true);
  });
});
