import {
  describe,
  expect,
  it,
} from "vitest";

import {
  TrailCrossFileMutationError,
} from "./trail-cross-file-mutation";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import {
  convertFleetingNoteToProjectInVault,
} from "./trail-fleeting-to-project-command";
import type {
  TrailArea,
  TrailFleetingNote,
} from "./trail-model";
import type {
  TrailProjectCreationSource,
} from "./trail-project-creation-service";
import type { TrailMutableFile } from "./trail-mutation-service";

const FLEETING_PATH = "Trail/Fleeting Notes.md";
const PROJECT_PATH =
  "Trail/Areas/Work/Project Launch.md";
const FLEETING_ID =
  "6bce718b-03df-4a9a-865d-b374139a962e";
const OTHER_FLEETING_ID =
  "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45";
const PROJECT_ID =
  "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const FLEETING_CREATED_AT =
  "2026-08-06T12:30:00+08:00";
const OTHER_FLEETING_CREATED_AT =
  "2026-08-06T12:31:00+08:00";
const area: TrailArea = {
  id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  name: "Work",
  created: "2026-08-04",
  description: "Work Area",
  filePath: "Trail/Areas/Work/Area.md",
};
const fleetingLine =
  `- Shape **Project Launch** <!-- trail:fleeting {"id":"${FLEETING_ID}","created":"${FLEETING_CREATED_AT}"} -->`;
const otherFleetingLine =
  `- Keep this Note <!-- trail:fleeting {"id":"${OTHER_FLEETING_ID}","created":"${OTHER_FLEETING_CREATED_AT}"} -->`;
const fleetingMarkdown = [
  fleetingLine,
  otherFleetingLine,
  "",
].join("\n");

type TestFile = TrailMutableFile;

interface TestSourceOptions {
  createError?: Error;
  processError?: Error;
  deleteError?: Error;
  existingProjectMarkdown?: string;
}

interface TestSource {
  source: TrailProjectCreationSource<TestFile>;
  operations: string[];
  read(path: string): string | undefined;
}

function createSource(
  options: TestSourceOptions = {},
): TestSource {
  const markdownByPath = new Map<string, string>([
    [FLEETING_PATH, fleetingMarkdown],
  ]);
  if (options.existingProjectMarkdown !== undefined) {
    markdownByPath.set(
      PROJECT_PATH,
      options.existingProjectMarkdown,
    );
  }
  const operations: string[] = [];

  return {
    operations,
    read: (path) => markdownByPath.get(path),
    source: {
      getFileByPath: (path) =>
        markdownByPath.has(path) ? { path } : null,
      getAbstractFileByPath: (path) =>
        markdownByPath.has(path) ? { path } : null,
      create: async (path, markdown) => {
        operations.push(`create:${path}`);
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
        operations.push(`delete:${file.path}`);
        if (options.deleteError) {
          throw options.deleteError;
        }
        markdownByPath.delete(file.path);
      },
      getFrontmatter: parseFrontmatter,
      process: async (file, update) => {
        operations.push(`process:${file.path}`);
        if (
          file.path === FLEETING_PATH
          && options.processError
        ) {
          throw options.processError;
        }
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

function conversionInput() {
  return {
    expectedNote: expectedNote(),
    targetArea: area,
    projectId: PROJECT_ID,
    projectName: "Project Launch",
    projectCreatedOn: "2026-08-06",
  };
}

describe("Trail Fleeting Note to Project command", () => {
  it("creates the Project before removing the Fleeting Note", async () => {
    const testSource = createSource();

    const created = await convertFleetingNoteToProjectInVault(
      testSource.source,
      conversionInput(),
    );

    expect(testSource.operations).toEqual([
      `create:${PROJECT_PATH}`,
      `process:${FLEETING_PATH}`,
    ]);
    expect(created).toMatchObject({
      id: PROJECT_ID,
      areaId: area.id,
      name: "Project Launch",
      created: "2026-08-06",
      status: "planned",
      overview: "Shape **Project Launch**",
      filePath: PROJECT_PATH,
    });
    expect(created.id).not.toBe(FLEETING_ID);
    expect(testSource.read(PROJECT_PATH)).toContain(
      "## Overview\n\nShape **Project Launch**",
    );
    expect(countFleetingNotes(
      testSource.read(FLEETING_PATH) ?? "",
      FLEETING_ID,
    )).toBe(0);
    expect(countFleetingNotes(
      testSource.read(FLEETING_PATH) ?? "",
      OTHER_FLEETING_ID,
    )).toBe(1);
  });

  it("leaves the source unchanged when Project creation fails", async () => {
    const testSource = createSource({
      createError: new Error("Injected create failure."),
    });

    const error = await captureError(
      () => convertFleetingNoteToProjectInVault(
        testSource.source,
        conversionInput(),
      ),
    );

    expect(error).toBeInstanceOf(
      TrailCrossFileMutationError,
    );
    expect(error).toMatchObject({
      code: "target-create-failed",
      outcome: "unchanged",
    });
    expect(testSource.read(PROJECT_PATH)).toBeUndefined();
    expect(testSource.read(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("compensates the Project when source removal fails", async () => {
    const testSource = createSource({
      processError: new Error("Injected source failure."),
    });

    const error = await captureError(
      () => convertFleetingNoteToProjectInVault(
        testSource.source,
        conversionInput(),
      ),
    );

    expect(error).toMatchObject({
      code: "source-remove-failed",
      outcome: "compensated",
    });
    expect(testSource.operations).toEqual([
      `create:${PROJECT_PATH}`,
      `process:${FLEETING_PATH}`,
      `delete:${PROJECT_PATH}`,
    ]);
    expect(testSource.read(PROJECT_PATH)).toBeUndefined();
    expect(testSource.read(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("reports partial when Project compensation also fails", async () => {
    const testSource = createSource({
      processError: new Error("Injected source failure."),
      deleteError: new Error("Injected compensation failure."),
    });

    const error = await captureError(
      () => convertFleetingNoteToProjectInVault(
        testSource.source,
        conversionInput(),
      ),
    );

    expect(error).toMatchObject({
      code: "compensation-failed",
      outcome: "partial",
    });
    expect(testSource.read(PROJECT_PATH)).toBeDefined();
    expect(testSource.read(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("reports a path conflict as unchanged", async () => {
    const testSource = createSource({
      existingProjectMarkdown: "Different Project.\n",
    });

    const error = await captureError(
      () => convertFleetingNoteToProjectInVault(
        testSource.source,
        conversionInput(),
      ),
    );

    expect(error).toMatchObject({
      code: "target-create-failed",
      outcome: "unchanged",
    });
    expect(testSource.read(PROJECT_PATH)).toBe(
      "Different Project.\n",
    );
    expect(testSource.read(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });
});

function expectedNote(): TrailFleetingNote {
  const result = parseFleetingNotes({
    filePath: FLEETING_PATH,
    markdown: fleetingMarkdown,
  });
  const note = result.notes.find(
    (candidate) => candidate.id === FLEETING_ID,
  );

  expect(result.issues).toEqual([]);
  if (!note) {
    throw new Error(
      `Expected Fleeting Note ${FLEETING_ID}.`,
    );
  }

  return note;
}

function countFleetingNotes(
  markdown: string,
  noteId: string,
): number {
  return parseFleetingNotes({
    filePath: FLEETING_PATH,
    markdown,
  }).notes.filter(
    (note) => note.id === noteId,
  ).length;
}

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

  throw new Error("Expected Project conversion to fail.");
}
