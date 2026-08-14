import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "./trail-issue";
import {
  TRAIL_PROJECTS_PATH,
} from "./trail-physical-schema";
import type { TrailProject } from "./trail-project";
import {
  serializeProjectMarkdown,
} from "./trail-project-markdown";
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
  readonly processInputs: string[];
} {
  const folder = new FakeFolder("Projects", TRAIL_PROJECTS_PATH);
  const markdownByPath = new Map<string, string>();
  const processInputs: string[] = [];

  const lookup = (path: string): FakeFile | FakeFolder | null => {
    if (path === TRAIL_PROJECTS_PATH) return folder;
    return folder.children.find((child) => child.path === path) ?? null;
  };
  const vault = {
    create: async (path: string, markdown: string): Promise<TFile> => {
      const file = new FakeFile(path.split("/").pop() ?? path, path);
      folder.children.push(file);
      markdownByPath.set(path, markdown);
      return file as unknown as TFile;
    },
    getAbstractFileByPath: lookup,
    process: async (
      file: TFile,
      processor: (data: string) => string,
    ): Promise<string> => {
      const latest = markdownByPath.get(file.path);
      if (latest === undefined) throw new Error("missing markdown");
      processInputs.push(latest);
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
    processInputs,
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

describe("Obsidian Workflow persistence", () => {
  it("keeps Project allocation in the shared physical allocator while persistence creates at the explicit path", async () => {
    const fixture = createFixture();
    const existing = new FakeFile(
      "0007 Existing.md",
      `${TRAIL_PROJECTS_PATH}/0007 Existing.md`,
    );
    fixture.folder.children.push(existing);
    fixture.markdownByPath.set(existing.path, serializeProjectMarkdown({
      ...project,
      id: "existing-project",
      title: "Existing",
    }));
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );

    const listed = await persistence.listProjectSources();
    expect(listed).toContainEqual({
      kind: "file",
      name: "0007 Existing.md",
      path: `${TRAIL_PROJECTS_PATH}/0007 Existing.md`,
    });

    const explicitPath = `${TRAIL_PROJECTS_PATH}/0042 Workflow Entry.md`;
    const result = await persistence.createProjectAtPath(explicitPath, project);

    expect(result.contribution?.filePath).toBe(explicitPath);
    expect(result.contribution?.project).toEqual(project);
  });

  it("keeps the legacy createProject facade wired through the shared allocator", async () => {
    const fixture = createFixture();
    const existing = new FakeFile(
      "0007 Existing.md",
      `${TRAIL_PROJECTS_PATH}/0007 Existing.md`,
    );
    fixture.folder.children.push(existing);
    fixture.markdownByPath.set(existing.path, serializeProjectMarkdown({
      ...project,
      id: "existing-project",
      title: "Existing",
    }));
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );

    const result = await persistence.createProject(project);

    expect(result.contribution?.filePath).toBe(
      `${TRAIL_PROJECTS_PATH}/0008 Workflow Entry.md`,
    );
  });

  it("applies Issue append and update to the latest Vault.process snapshot", async () => {
    const fixture = createFixture();
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );
    const path = `${TRAIL_PROJECTS_PATH}/0001 Workflow Entry.md`;
    const created = await persistence.createProjectAtPath(path, project);
    if (created.contribution === undefined) throw new Error("missing created Project");

    fixture.markdownByPath.set(
      path,
      fixture.markdownByPath.get(path)?.replace(
        "# Milestones",
        "Project body from an external edit.\n\n# Milestones",
      ) ?? "",
    );
    const withIssue = await persistence.appendIssue(path, project, issue);
    expect(fixture.processInputs[0]).toContain("Project body from an external edit.");

    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");
    const result = await persistence.updateIssue(
      path,
      expectedIssue,
      {
        ...expectedIssue,
        firstStartedAt: 200,
        statusDefinitionId: "issue-started",
      },
    );

    expect(result.contribution?.issuesById[issue.id]).toMatchObject({
      firstStartedAt: 200,
      statusDefinitionId: "issue-started",
    });
  });

  it("refuses a stale Issue update instead of overwriting an external title change", async () => {
    const fixture = createFixture();
    const persistence = createObsidianWorkflowPersistence(
      fixture.app,
      parseYaml,
      fileKinds,
    );
    const path = `${TRAIL_PROJECTS_PATH}/0001 Workflow Entry.md`;
    await persistence.createProjectAtPath(path, project);
    const withIssue = await persistence.appendIssue(path, project, issue);
    const expectedIssue = withIssue.contribution?.issuesById[issue.id];
    if (expectedIssue === undefined) throw new Error("missing appended Issue");
    fixture.markdownByPath.set(
      path,
      fixture.markdownByPath.get(path)?.replace(
        "## Implement flow",
        "## External edit",
      ) ?? "",
    );

    await expect(persistence.updateIssue(
      path,
      expectedIssue,
      { ...expectedIssue, statusDefinitionId: "issue-started" },
    )).rejects.toMatchObject({ code: "conflict" });

    expect(fixture.markdownByPath.get(path)).toContain("## External edit");
  });
});
