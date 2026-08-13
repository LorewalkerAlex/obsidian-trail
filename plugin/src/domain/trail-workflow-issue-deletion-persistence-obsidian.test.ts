import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "./trail-issue";
import { TRAIL_PROJECTS_PATH } from "./trail-physical-schema";
import type { TrailProject } from "./trail-project";
import { createObsidianWorkflowPersistence } from "./trail-workflow-persistence-obsidian";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";

class FakeFile {
  public constructor(
    public readonly name: string,
    public readonly path: string,
  ) {}
}

class FakeFolder {
  public readonly children: Array<FakeFile | FakeFolder> = [];

  public constructor(
    public readonly name: string,
    public readonly path: string,
  ) {}
}

const fileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof FakeFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof FakeFolder,
};

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

function createFixture(): {
  readonly app: Pick<App, "vault">;
  readonly folder: FakeFolder;
  readonly markdownByPath: Map<string, string>;
} {
  const folder = new FakeFolder("Projects", TRAIL_PROJECTS_PATH);
  const markdownByPath = new Map<string, string>();

  const lookup = (path: string): FakeFile | FakeFolder | null => {
    if (path === TRAIL_PROJECTS_PATH) return folder;
    return folder.children.find((child) => child.path === path) ?? null;
  };
  const vault = {
    create: async (path: string, markdown: string) => {
      const file = new FakeFile(path.split("/").pop() ?? path, path);
      folder.children.push(file);
      markdownByPath.set(path, markdown);
      return file;
    },
    getAbstractFileByPath: lookup,
    process: async (
      file: TFile,
      processor: (data: string) => string,
    ): Promise<string> => {
      const latest = markdownByPath.get(file.path);
      if (latest === undefined) throw new Error("missing markdown");
      const next = processor(latest);
      markdownByPath.set(file.path, next);
      return next;
    },
    read: async (file: TFile): Promise<string> => {
      const markdown = markdownByPath.get(file.path);
      if (markdown === undefined) throw new Error("missing markdown");
      return markdown;
    },
  };
  return {
    app: { vault } as unknown as Pick<App, "vault">,
    folder,
    markdownByPath,
  };
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
  id: "workflow-b",
  labelIds: [],
  projectId: project.id,
  statusDefinitionId: "issue-backlog",
  title: "Accepted capture",
};

describe("Obsidian Workflow Issue deletion capability", () => {
  it("removes the expected target Issue from the latest Vault.process snapshot", async () => {
    const fixture = createFixture();
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );
    const created = await persistence.createProject(project);
    const path = created.contribution?.filePath;
    if (path === undefined) throw new Error("missing created path");
    const withIssue = await persistence.appendIssue(path, project, issue);
    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");

    fixture.markdownByPath.set(
      path,
      fixture.markdownByPath.get(path)?.replace(
        "# Milestones",
        "External Project note.\n\n# Milestones",
      ) ?? "",
    );
    const result = await persistence.deleteIssue(path, expectedIssue);

    expect(result.contribution?.issuesById[issue.id]).toBeUndefined();
    expect(fixture.markdownByPath.get(path)).toContain("External Project note.");
  });

  it("refuses compensation when the target Issue has changed externally", async () => {
    const fixture = createFixture();
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );
    const created = await persistence.createProject(project);
    const path = created.contribution?.filePath;
    if (path === undefined) throw new Error("missing created path");
    const withIssue = await persistence.appendIssue(path, project, issue);
    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");
    fixture.markdownByPath.set(
      path,
      fixture.markdownByPath.get(path)?.replace(
        "## Accepted capture",
        "## External target edit",
      ) ?? "",
    );

    await expect(persistence.deleteIssue(path, expectedIssue)).rejects.toMatchObject({
      code: "conflict",
    });
    expect(fixture.markdownByPath.get(path)).toContain("## External target edit");
  });
});
