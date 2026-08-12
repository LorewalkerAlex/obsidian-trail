import {
  describe,
  expect,
  it,
} from "vitest";

import type { TrailArea } from "./trail-model";
import {
  createProjectInVault,
  removeCreatedProjectInVault,
  TrailProjectCreationMutationError,
  type TrailProjectCreationSource,
} from "./trail-project-creation-service";
import {
  createPlannedProjectMarkdown,
  type TrailPlannedProjectDraft,
} from "./trail-project-creation";
import type { TrailMutableFile } from "./trail-mutation-service";

const PROJECT_PATH =
  "Trail/Areas/Work/Project Launch.md";
const area: TrailArea = {
  id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  name: "Work",
  created: "2026-08-04",
  description: "Work Area",
  filePath: "Trail/Areas/Work/Area.md",
};
const project: TrailPlannedProjectDraft = {
  id: "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb",
  name: "Project Launch",
  created: "2026-08-06",
  overview: "Shape the launch plan.",
};
const projectMarkdown = createPlannedProjectMarkdown(
  project,
);

type TestFile = TrailMutableFile;

interface TestSourceOptions {
  markdownByPath?: Map<string, string>;
  abstractPaths?: Set<string>;
  createError?: Error;
  deleteError?: Error;
}

interface TestSource {
  source: TrailProjectCreationSource<TestFile>;
  markdownByPath: Map<string, string>;
  createdPaths: string[];
  deletedPaths: string[];
}

function createSource(
  options: TestSourceOptions = {},
): TestSource {
  const markdownByPath = new Map(
    options.markdownByPath ?? [],
  );
  const abstractPaths = new Set(
    options.abstractPaths ?? [],
  );
  const createdPaths: string[] = [];
  const deletedPaths: string[] = [];

  return {
    markdownByPath,
    createdPaths,
    deletedPaths,
    source: {
      getFileByPath: (path) =>
        markdownByPath.has(path) ? { path } : null,
      getAbstractFileByPath: (path) => {
        if (markdownByPath.has(path) || abstractPaths.has(path)) {
          return { path };
        }

        return null;
      },
      create: async (path, markdown) => {
        createdPaths.push(path);
        if (options.createError) {
          throw options.createError;
        }
        markdownByPath.set(path, markdown);
        return { path };
      },
      read: async (file) => {
        const markdown = markdownByPath.get(file.path);
        if (markdown === undefined) {
          throw new Error(`Missing test Markdown: ${file.path}`);
        }

        return markdown;
      },
      deleteFile: async (file) => {
        deletedPaths.push(file.path);
        if (options.deleteError) {
          throw options.deleteError;
        }
        markdownByPath.delete(file.path);
      },
      getFrontmatter: parseFrontmatter,
      process: async (file, update) => {
        const current = markdownByPath.get(file.path);
        if (current === undefined) {
          throw new Error(`Missing test Markdown: ${file.path}`);
        }
        const next = update(current);
        markdownByPath.set(file.path, next);
        return next;
      },
    },
  };
}

describe("Trail Project creation service", () => {
  it("creates and verifies a planned Project", async () => {
    const testSource = createSource();

    const created = await createProjectInVault(
      testSource.source,
      { area, project },
    );

    expect(testSource.createdPaths).toEqual([
      PROJECT_PATH,
    ]);
    expect(created.project).toMatchObject({
      id: project.id,
      areaId: area.id,
      name: project.name,
      created: project.created,
      status: "planned",
      overview: project.overview,
      filePath: PROJECT_PATH,
    });
    expect(created.fingerprint).toBe(projectMarkdown);
  });

  it("is idempotent when the exact Project already exists", async () => {
    const testSource = createSource({
      markdownByPath: new Map([
        [PROJECT_PATH, projectMarkdown],
      ]),
    });

    const created = await createProjectInVault(
      testSource.source,
      { area, project },
    );

    expect(testSource.createdPaths).toEqual([]);
    expect(created.project.id).toBe(project.id);
  });

  it("rejects a conflicting file at the Project path", async () => {
    const testSource = createSource({
      markdownByPath: new Map([
        [PROJECT_PATH, "Different Project content.\n"],
      ]),
    });

    await expect(createProjectInVault(
      testSource.source,
      { area, project },
    )).rejects.toMatchObject({
      code: "project-path-conflict",
    });
  });

  it("rejects a folder at the Project path", async () => {
    const testSource = createSource({
      abstractPaths: new Set([PROJECT_PATH]),
    });

    await expect(createProjectInVault(
      testSource.source,
      { area, project },
    )).rejects.toMatchObject({
      code: "project-path-conflict",
    });
  });

  it("removes an unchanged created Project", async () => {
    const testSource = createSource();
    const created = await createProjectInVault(
      testSource.source,
      { area, project },
    );

    await removeCreatedProjectInVault(
      testSource.source,
      { expectedProject: created },
    );

    expect(testSource.deletedPaths).toEqual([
      PROJECT_PATH,
    ]);
    expect(
      testSource.markdownByPath.has(PROJECT_PATH),
    ).toBe(false);
  });

  it("does not compensate a Project changed after creation", async () => {
    const testSource = createSource();
    const created = await createProjectInVault(
      testSource.source,
      { area, project },
    );
    testSource.markdownByPath.set(
      PROJECT_PATH,
      `${projectMarkdown}\nExternal edit.\n`,
    );

    const error = await captureError(
      () => removeCreatedProjectInVault(
        testSource.source,
        { expectedProject: created },
      ),
    );

    expect(error).toBeInstanceOf(
      TrailProjectCreationMutationError,
    );
    expect(error).toMatchObject({
      code: "project-changed",
    });
    expect(
      testSource.markdownByPath.has(PROJECT_PATH),
    ).toBe(true);
  });
});

function parseFrontmatter(
  markdown: string,
): Record<string, unknown> | undefined {
  const match = /^---\n([\s\S]*?)\n---/.exec(markdown);
  if (!match) {
    return undefined;
  }

  return Object.fromEntries(
    match[1].split("\n").map((line) => {
      const separator = line.indexOf(":");
      const key = line.slice(0, separator).trim();
      const rawValue = line.slice(separator + 1).trim();
      const value = rawValue.startsWith('"')
        ? JSON.parse(rawValue) as unknown
        : rawValue;
      return [key, value];
    }),
  );
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected Project mutation to fail.");
}
