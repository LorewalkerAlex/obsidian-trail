import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import { serializeProjectMarkdown } from "../../markdown/codecs/trail-project-codec";
import { TRAIL_PROJECTS_PATH } from "../../markdown/schema/trail-physical-schema";
import type { TrailSourceEntry, TrailSourceIO } from "../ports/trail-source-io";
import { createTrailDomainSourceRepository } from "./trail-domain-source-repository";
import { createProjectSourcePersistence } from "./trail-project-source-persistence";

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

function createFixture() {
  const markdownByPath = new Map<string, string>();
  let entries: TrailSourceEntry[] = [];
  const processInputs: string[] = [];
  const sourceIO: TrailSourceIO = {
    async create(path, content) {
      markdownByPath.set(path, content);
      const name = path.split("/").pop() ?? path;
      entries = [...entries.filter((entry) => entry.path !== path), {
        kind: "file",
        name,
        path,
      }];
    },
    async delete(path) {
      markdownByPath.delete(path);
      entries = entries.filter((entry) => entry.path !== path);
    },
    async list(path) {
      if (path !== TRAIL_PROJECTS_PATH) return [];
      return entries;
    },
    async process(path, transform) {
      const latest = markdownByPath.get(path);
      if (latest === undefined) throw new Error(`missing markdown: ${path}`);
      processInputs.push(latest);
      markdownByPath.set(path, transform(latest));
    },
    async read(path) {
      const markdown = markdownByPath.get(path);
      if (markdown === undefined) throw new Error(`missing markdown: ${path}`);
      return markdown;
    },
    async rename(from, to) {
      const markdown = markdownByPath.get(from);
      if (markdown === undefined) throw new Error(`missing markdown: ${from}`);
      markdownByPath.delete(from);
      markdownByPath.set(to, markdown);
    },
  };
  return {
    markdownByPath,
    persistence: createProjectSourcePersistence(
      createTrailDomainSourceRepository(sourceIO),
      parseYaml,
    ),
    processInputs,
    setEntries(next: TrailSourceEntry[]) {
      entries = next;
    },
  };
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
  title: "Implement flow",
};
const path = `${TRAIL_PROJECTS_PATH}/0001 Workflow Entry.md`;

describe("Project source persistence", () => {
  it("creates only at an explicit sequenced path and exposes Project source entries", async () => {
    const fixture = createFixture();
    const created = await fixture.persistence.createProjectAtPath(path, project);

    expect(created.contribution?.filePath).toBe(path);
    expect(created.contribution?.project).toEqual(project);
    expect(await fixture.persistence.listProjectSources()).toContainEqual({
      kind: "file",
      name: "0001 Workflow Entry.md",
      path,
    });
    await expect(fixture.persistence.createProjectAtPath(
      `${TRAIL_PROJECTS_PATH}/Workflow Entry.md`,
      project,
    )).rejects.toThrow("Project path must use a four-digit sequence");
  });

  it("appends, updates, and deletes against the latest Project source", async () => {
    const fixture = createFixture();
    await fixture.persistence.createProjectAtPath(path, project);
    fixture.markdownByPath.set(
      path,
      serializeProjectMarkdown(project).replace(
        "# Milestones",
        "External Project note.\n\n# Milestones",
      ),
    );

    const withIssue = await fixture.persistence.appendIssue(path, project, issue);
    expect(fixture.processInputs[0]).toContain("External Project note.");
    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");

    const updated = await fixture.persistence.updateIssue(path, expectedIssue, {
      ...expectedIssue,
      firstStartedAt: 200,
      statusDefinitionId: "issue-started",
    });
    const updatedIssue = updated.contribution?.issuesById[issue.id];
    expect(updatedIssue).toMatchObject({
      firstStartedAt: 200,
      statusDefinitionId: "issue-started",
    });
    if (updatedIssue === undefined) throw new Error("missing updated Issue");

    const deleted = await fixture.persistence.deleteIssue(path, updatedIssue);
    expect(deleted.contribution?.issuesById[issue.id]).toBeUndefined();
    expect(fixture.markdownByPath.get(path)).toContain("External Project note.");
  });

  it("rejects a stale Issue mutation instead of overwriting an external edit", async () => {
    const fixture = createFixture();
    await fixture.persistence.createProjectAtPath(path, project);
    const withIssue = await fixture.persistence.appendIssue(path, project, issue);
    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");
    fixture.markdownByPath.set(
      path,
      fixture.markdownByPath.get(path)?.replace(
        "## Implement flow",
        "## External edit",
      ) ?? "",
    );

    await expect(fixture.persistence.updateIssue(
      path,
      expectedIssue,
      { ...expectedIssue, statusDefinitionId: "issue-started" },
    )).rejects.toMatchObject({ code: "conflict" });
    await expect(fixture.persistence.deleteIssue(
      path,
      expectedIssue,
    )).rejects.toMatchObject({ code: "conflict" });
    expect(fixture.markdownByPath.get(path)).toContain("## External edit");
  });

  it("reports invalid direct children while reading valid Project sources", async () => {
    const fixture = createFixture();
    fixture.markdownByPath.set(path, serializeProjectMarkdown(project));
    fixture.setEntries([
      { kind: "directory", name: "Nested", path: `${TRAIL_PROJECTS_PATH}/Nested` },
      { kind: "file", name: "notes.txt", path: `${TRAIL_PROJECTS_PATH}/notes.txt` },
      { kind: "file", name: "0001 Workflow Entry.md", path },
    ]);

    const result = await fixture.persistence.readAll();

    expect(result.projectResults).toHaveLength(1);
    expect(result.projectResults[0].contribution?.project).toEqual(project);
    expect(result.structuralIssues.map((entry) => entry.code)).toEqual([
      "workflow.projects.child-directory",
      "workflow.projects.non-markdown",
    ]);
  });
});
