import { describe, expect, it } from "vitest";

import {
  readTrailVault,
  type TrailReadableFile,
  type TrailVaultSource,
} from "./trail-vault-reader";

const AREA_ID = "df4ec59e-bfe4-4a09-a079-43ff9350642d";
const SECOND_AREA_ID =
  "dd080222-f987-41f5-a903-22d4f7bb8806";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const SECOND_PROJECT_ID =
  "b65b4b98-2970-46c5-a149-ea93afb9241e";
const TASK_ID = "fa3b3a46-f818-416a-9dd0-59aa168bc467";
const SECOND_TASK_ID =
  "cdd5c730-a516-40ed-a21b-cdd97055a2f8";

type TestFile = TrailReadableFile;

interface TestSource {
  source: TrailVaultSource<TestFile>;
  readPaths: string[];
}

function createFile(path: string): TestFile {
  const fileName = path.split("/").pop();

  if (!fileName) {
    throw new Error(`Invalid test file path: ${path}`);
  }

  return {
    path,
    basename: fileName.replace(/\.md$/, ""),
  };
}

function createSource(
  paths: string[],
  markdownByPath: Record<string, string>,
  frontmatterByPath: Record<
    string,
    Record<string, unknown>
  >,
  readErrorByPath: Record<string, string> = {},
): TestSource {
  const readPaths: string[] = [];

  return {
    readPaths,
    source: {
      getMarkdownFiles: () =>
        paths.map((path) => createFile(path)),

      cachedRead: (file) => {
        readPaths.push(file.path);

        const readError = readErrorByPath[file.path];
        if (readError) {
          return Promise.reject(new Error(readError));
        }

        return Promise.resolve(
          markdownByPath[file.path] ?? "",
        );
      },

      getFrontmatter: (file) =>
        frontmatterByPath[file.path],
    },
  };
}

function createAreaMarkdown(
  areaId = AREA_ID,
): string {
  return [
    "---",
    `id: "${areaId}"`,
    "created: 2026-08-04",
    "---",
    "",
    "用于测试 Reader 的 Area。",
    "",
  ].join("\n");
}

function createProjectMarkdown(
  projectId: string,
  taskId = TASK_ID,
): string {
  return [
    "---",
    `id: "${projectId}"`,
    "created: 2026-08-04",
    "status: active",
    "---",
    "",
    "## Overview",
    "",
    "Reader integration fixture.",
    "",
    "## Tasks",
    "",
    `- [ ] Read project <!-- trail:task {"id":"${taskId}","status":"todo","priority":"medium","created":"2026-08-04T10:00:00+08:00","labels":[]} -->`,
    "",
    "## Notes",
    "",
    "- Reader test note.",
    "",
  ].join("\n");
}

describe("Trail Vault reader", () => {
  it("discovers direct Area and Project files", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const projectPath =
      "Trail/Areas/Work/Trail POC.md";

    const { source, readPaths } = createSource(
      [
        "docs/technical-design.md",
        "Trail/Fleeting/Idea.md",
        "Trail/Areas/Work/Nested/Ignored.md",
        projectPath,
        areaPath,
      ],
      {
        [areaPath]: createAreaMarkdown(),
        [projectPath]:
          createProjectMarkdown(PROJECT_ID),
      },
      {
        [areaPath]: {
          id: AREA_ID,
          created: "2026-08-04",
        },
        [projectPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
    );

    const result = await readTrailVault(source);

    expect(result.issues).toEqual([]);
    expect(result.areas).toHaveLength(1);
    expect(result.projects).toHaveLength(1);

    expect(result.areas[0]).toMatchObject({
      id: AREA_ID,
      name: "Work",
      filePath: areaPath,
    });

    expect(result.projects[0]).toMatchObject({
      id: PROJECT_ID,
      areaId: AREA_ID,
      areaName: "Work",
      name: "Trail POC",
      filePath: projectPath,
    });

    expect(result.projects[0].tasks).toHaveLength(1);
    expect(readPaths.sort()).toEqual(
      [areaPath, projectPath].sort(),
    );
  });

  it("reports an Area directory without Area.md", async () => {
    const projectPath =
      "Trail/Areas/Work/Trail POC.md";

    const { source } = createSource(
      [projectPath],
      {
        [projectPath]:
          createProjectMarkdown(PROJECT_ID),
      },
      {
        [projectPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
    );

    const result = await readTrailVault(source);

    expect(result.areas).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.issues).toContainEqual({
      scope: "file",
      code: "area.file.missing",
      message:
        'Area "Work" does not contain Area.md.',
      filePath: "Trail/Areas/Work/Area.md",
    });
  });

  it("keeps valid Projects when another file is invalid", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const validPath =
      "Trail/Areas/Work/Valid Project.md";
    const invalidPath =
      "Trail/Areas/Work/Broken Project.md";

    const invalidMarkdown = [
      "---",
      `id: "${SECOND_PROJECT_ID}"`,
      "created: 2026-08-04",
      "status: active",
      "---",
      "",
      "## Overview",
      "",
      "The required sections are missing.",
      "",
    ].join("\n");

    const { source } = createSource(
      [areaPath, invalidPath, validPath],
      {
        [areaPath]: createAreaMarkdown(),
        [validPath]:
          createProjectMarkdown(PROJECT_ID),
        [invalidPath]: invalidMarkdown,
      },
      {
        [areaPath]: {
          id: AREA_ID,
          created: "2026-08-04",
        },
        [validPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
        [invalidPath]: {
          id: SECOND_PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
    );

    const result = await readTrailVault(source);

    expect(result.areas).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe(
      "Valid Project",
    );

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "file",
        code: "project.sections.invalid",
        filePath: invalidPath,
      }),
    );
  });

  it("isolates Area and Project read failures", async () => {
    const personalAreaPath =
      "Trail/Areas/Personal/Area.md";
    const workAreaPath = "Trail/Areas/Work/Area.md";
    const brokenProjectPath =
      "Trail/Areas/Work/Broken Project.md";
    const validProjectPath =
      "Trail/Areas/Work/Valid Project.md";

    const { source } = createSource(
      [
        personalAreaPath,
        workAreaPath,
        brokenProjectPath,
        validProjectPath,
      ],
      {
        [workAreaPath]: createAreaMarkdown(),
        [validProjectPath]: createProjectMarkdown(
          PROJECT_ID,
          SECOND_TASK_ID,
        ),
      },
      {
        [personalAreaPath]: {
          id: SECOND_AREA_ID,
          created: "2026-08-04",
        },
        [workAreaPath]: {
          id: AREA_ID,
          created: "2026-08-04",
        },
        [brokenProjectPath]: {
          id: SECOND_PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
        [validProjectPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
      {
        [personalAreaPath]: "Area read failed.",
        [brokenProjectPath]: "Project read failed.",
      },
    );

    const result = await readTrailVault(source);

    expect(result.areas).toHaveLength(1);
    expect(result.areas[0].name).toBe("Work");
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe(
      "Valid Project",
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: "file",
          code: "file.read.failed",
          filePath: personalAreaPath,
        }),
        expect.objectContaining({
          scope: "file",
          code: "file.read.failed",
          filePath: brokenProjectPath,
        }),
      ]),
    );
  });

  it("reports duplicate Task ids across Projects", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const firstPath =
      "Trail/Areas/Work/First Project.md";
    const secondPath =
      "Trail/Areas/Work/Second Project.md";

    const { source } = createSource(
      [areaPath, firstPath, secondPath],
      {
        [areaPath]: createAreaMarkdown(),
        [firstPath]: createProjectMarkdown(PROJECT_ID),
        [secondPath]: createProjectMarkdown(
          SECOND_PROJECT_ID,
        ),
      },
      {
        [areaPath]: {
          id: AREA_ID,
          created: "2026-08-04",
        },
        [firstPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
        [secondPath]: {
          id: SECOND_PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
    );

    const result = await readTrailVault(source);

    expect(result.projects).toHaveLength(2);
    expect(result.projects[0].tasks).toHaveLength(1);
    expect(result.projects[1].tasks).toHaveLength(0);
    expect(result.issues).toContainEqual({
      scope: "task",
      code: "task.id.duplicate",
      message:
        `Task UUID "${TASK_ID}" is already in use.`,
      filePath: secondPath,
      objectId: TASK_ID,
    });
  });

  it("reports and omits duplicate Project ids", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const firstPath =
      "Trail/Areas/Work/First Project.md";
    const secondPath =
      "Trail/Areas/Work/Second Project.md";

    const { source } = createSource(
      [areaPath, firstPath, secondPath],
      {
        [areaPath]: createAreaMarkdown(),
        [firstPath]:
          createProjectMarkdown(PROJECT_ID),
        [secondPath]:
          createProjectMarkdown(PROJECT_ID),
      },
      {
        [areaPath]: {
          id: AREA_ID,
          created: "2026-08-04",
        },
        [firstPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
        [secondPath]: {
          id: PROJECT_ID,
          created: "2026-08-04",
          status: "active",
        },
      },
    );

    const result = await readTrailVault(source);

    expect(result.projects).toHaveLength(1);
    expect(result.issues).toContainEqual({
      scope: "file",
      code: "project.id.duplicate",
      message:
        `Project UUID "${PROJECT_ID}" is already in use.`,
      filePath: secondPath,
      objectId: PROJECT_ID,
    });
  });
});
