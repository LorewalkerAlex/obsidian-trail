import {
  describe,
  expect,
  it,
} from "vitest";

import {
  TrailCrossFileMutationError,
} from "./trail-cross-file-mutation";
import {
  parseFleetingNotes,
} from "./trail-fleeting-note-parser";
import {
  convertFleetingNoteToTaskInVault,
} from "./trail-fleeting-to-task-command";
import type {
  TrailFleetingNote,
  TrailTask,
} from "./trail-model";
import {
  TrailMutationError,
  type TrailMutableFile,
  type TrailMutationSource,
} from "./trail-mutation-service";
import {
  parseProjectTasks,
} from "./trail-parser";

const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";
const PROJECT_ID =
  "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const EXISTING_TASK_ID =
  "8c774a86-54aa-48d3-9010-99372d0738fc";
const CREATED_TASK_ID =
  "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const TASK_CREATED_AT =
  "2026-08-05T17:10:00+08:00";
const FLEETING_PATH = "Trail/Fleeting Notes.md";
const FLEETING_ID =
  "6bce718b-03df-4a9a-865d-b374139a962e";
const OTHER_FLEETING_ID =
  "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45";
const FLEETING_CREATED_AT =
  "2026-08-05T16:25:00+08:00";
const OTHER_FLEETING_CREATED_AT =
  "2026-08-05T16:26:00+08:00";

const projectMarkdown = [
  "---",
  `id: "${PROJECT_ID}"`,
  "created: 2026-08-04",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "Conversion fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Existing Task <!-- trail:task {"id":"${EXISTING_TASK_ID}","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":[]} -->`,
  "",
  "## Notes",
  "",
  "- Project note.",
  "",
].join("\n");

const fleetingLine =
  `- Convert **this note** <!-- trail:fleeting {"id":"${FLEETING_ID}","created":"${FLEETING_CREATED_AT}"} -->`;
const otherFleetingLine =
  `- Keep this note <!-- trail:fleeting {"id":"${OTHER_FLEETING_ID}","created":"${OTHER_FLEETING_CREATED_AT}"} -->`;
const fleetingMarkdown = [
  fleetingLine,
  otherFleetingLine,
  "",
].join("\n");

type TestFile = TrailMutableFile;

interface ProcessAttempt {
  path: string;
  pathCall: number;
  globalCall: number;
}

interface TestSourceOptions {
  missingPaths?: Set<string>;
  processError?: (
    attempt: ProcessAttempt,
  ) => Error | undefined;
}

interface TestSource {
  source: TrailMutationSource<TestFile>;
  processPaths: string[];
  readMarkdown: (path: string) => string;
}

function createSource(
  options: TestSourceOptions = {},
): TestSource {
  const files = new Map<string, TestFile>([
    [PROJECT_PATH, { path: PROJECT_PATH }],
    [FLEETING_PATH, { path: FLEETING_PATH }],
  ]);
  const markdownByPath = new Map<string, string>([
    [PROJECT_PATH, projectMarkdown],
    [FLEETING_PATH, fleetingMarkdown],
  ]);
  const pathCalls = new Map<string, number>();
  const processPaths: string[] = [];

  return {
    processPaths,
    readMarkdown: (path) => {
      const markdown = markdownByPath.get(path);

      if (markdown === undefined) {
        throw new Error(`Missing test Markdown: ${path}`);
      }

      return markdown;
    },
    source: {
      getFileByPath: (path) =>
        options.missingPaths?.has(path) === true
          ? null
          : files.get(path) ?? null,

      process: async (file, update) => {
        const pathCall = (pathCalls.get(file.path) ?? 0) + 1;
        pathCalls.set(file.path, pathCall);
        processPaths.push(file.path);

        const error = options.processError?.({
          path: file.path,
          pathCall,
          globalCall: processPaths.length,
        });

        if (error) {
          throw error;
        }

        const current = markdownByPath.get(file.path);

        if (current === undefined) {
          throw new Error(
            `Missing test Markdown: ${file.path}`,
          );
        }

        const updated = update(current);
        markdownByPath.set(file.path, updated);
        return updated;
      },
    },
  };
}

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

function conversionInput() {
  return {
    expectedNote: expectedNote(),
    targetProjectId: PROJECT_ID,
    targetProjectPath: PROJECT_PATH,
    taskId: CREATED_TASK_ID,
    taskCreatedAt: TASK_CREATED_AT,
  };
}

function countTasks(
  markdown: string,
  taskId: string,
): number {
  return parseProjectTasks(
    {
      filePath: PROJECT_PATH,
      markdown,
    },
    PROJECT_ID,
  ).tasks.filter(
    (task) => task.id === taskId,
  ).length;
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

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected the conversion to fail.");
}

function requireCrossFileMutationError(
  error: unknown,
): TrailCrossFileMutationError {
  expect(error).toBeInstanceOf(
    TrailCrossFileMutationError,
  );

  if (!(error instanceof TrailCrossFileMutationError)) {
    throw new Error(
      "Expected a TrailCrossFileMutationError.",
    );
  }

  return error;
}

function requireTrailMutationError(
  error: unknown,
): TrailMutationError {
  expect(error).toBeInstanceOf(TrailMutationError);

  if (!(error instanceof TrailMutationError)) {
    throw new Error("Expected a TrailMutationError.");
  }

  return error;
}

function requireCreatedTask(
  value: unknown,
): TrailTask {
  if (!isTrailTask(value)) {
    throw new Error("Expected a created Trail Task.");
  }

  return value;
}

function isTrailTask(value: unknown): value is TrailTask {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return "id" in value
    && typeof value.id === "string"
    && "projectPath" in value
    && typeof value.projectPath === "string";
}

describe("Trail Fleeting Note to Task command", () => {
  it("creates the Task before removing the Fleeting Note", async () => {
    const { source, processPaths, readMarkdown } =
      createSource();

    const createdTask = await convertFleetingNoteToTaskInVault(
      source,
      conversionInput(),
    );

    expect(processPaths).toEqual([
      PROJECT_PATH,
      FLEETING_PATH,
    ]);
    expect(createdTask).toMatchObject({
      id: CREATED_TASK_ID,
      title: "Convert **this note**",
      status: "backlog",
      priority: "medium",
      created: TASK_CREATED_AT,
    });
    expect(createdTask.id).not.toBe(FLEETING_ID);
    expect(countTasks(
      readMarkdown(PROJECT_PATH),
      CREATED_TASK_ID,
    )).toBe(1);
    expect(countFleetingNotes(
      readMarkdown(FLEETING_PATH),
      FLEETING_ID,
    )).toBe(0);
    expect(countFleetingNotes(
      readMarkdown(FLEETING_PATH),
      OTHER_FLEETING_ID,
    )).toBe(1);
  });

  it("is idempotent when the completed command is retried", async () => {
    const { source, processPaths, readMarkdown } =
      createSource();
    const input = conversionInput();

    const firstTask = await convertFleetingNoteToTaskInVault(
      source,
      input,
    );
    const secondTask = await convertFleetingNoteToTaskInVault(
      source,
      input,
    );

    expect(processPaths).toEqual([
      PROJECT_PATH,
      FLEETING_PATH,
      PROJECT_PATH,
      FLEETING_PATH,
    ]);
    expect(secondTask.source.fingerprint).toBe(
      firstTask.source.fingerprint,
    );
    expect(countTasks(
      readMarkdown(PROJECT_PATH),
      CREATED_TASK_ID,
    )).toBe(1);
    expect(countFleetingNotes(
      readMarkdown(FLEETING_PATH),
      FLEETING_ID,
    )).toBe(0);
  });

  it("leaves both files unchanged when target creation fails", async () => {
    const { source, processPaths, readMarkdown } =
      createSource({
        missingPaths: new Set([PROJECT_PATH]),
      });
    const error = await captureError(
      () => convertFleetingNoteToTaskInVault(
        source,
        conversionInput(),
      ),
    );

    const mutationError =
      requireCrossFileMutationError(error);
    const cause = requireTrailMutationError(
      mutationError.cause,
    );

    expect(mutationError.code).toBe(
      "target-create-failed",
    );
    expect(mutationError.outcome).toBe("unchanged");
    expect(cause.code).toBe("project-file-not-found");
    expect(processPaths).toEqual([]);
    expect(readMarkdown(PROJECT_PATH)).toBe(
      projectMarkdown,
    );
    expect(readMarkdown(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("compensates the created Task when source removal fails", async () => {
    const sourceFailure = new Error(
      "Fleeting Notes write failed.",
    );
    const { source, processPaths, readMarkdown } =
      createSource({
        processError: ({ path }) =>
          path === FLEETING_PATH
            ? sourceFailure
            : undefined,
      });
    const error = await captureError(
      () => convertFleetingNoteToTaskInVault(
        source,
        conversionInput(),
      ),
    );

    const mutationError =
      requireCrossFileMutationError(error);
    const cause = requireTrailMutationError(
      mutationError.cause,
    );
    const targetResult = requireCreatedTask(
      mutationError.targetResult,
    );

    expect(mutationError.code).toBe(
      "source-remove-failed",
    );
    expect(mutationError.outcome).toBe("compensated");
    expect(cause.code).toBe("vault-process-failed");
    expect(cause.cause).toBe(sourceFailure);
    expect(targetResult.id).toBe(CREATED_TASK_ID);
    expect(processPaths).toEqual([
      PROJECT_PATH,
      FLEETING_PATH,
      PROJECT_PATH,
    ]);
    expect(readMarkdown(PROJECT_PATH)).toBe(
      projectMarkdown,
    );
    expect(readMarkdown(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("reports a partial result when compensation also fails", async () => {
    const sourceFailure = new Error(
      "Fleeting Notes write failed.",
    );
    const compensationFailure = new Error(
      "Project compensation failed.",
    );
    const { source, processPaths, readMarkdown } =
      createSource({
        processError: ({ path, pathCall }) => {
          if (path === FLEETING_PATH) {
            return sourceFailure;
          }

          if (
            path === PROJECT_PATH
            && pathCall === 2
          ) {
            return compensationFailure;
          }

          return undefined;
        },
      });
    const error = await captureError(
      () => convertFleetingNoteToTaskInVault(
        source,
        conversionInput(),
      ),
    );

    const mutationError =
      requireCrossFileMutationError(error);
    const cause = requireTrailMutationError(
      mutationError.cause,
    );
    const targetResult = requireCreatedTask(
      mutationError.targetResult,
    );
    const compensationCause =
      requireTrailMutationError(
        mutationError.compensationCause,
      );

    expect(mutationError.code).toBe(
      "compensation-failed",
    );
    expect(mutationError.outcome).toBe("partial");
    expect(cause.code).toBe("vault-process-failed");
    expect(cause.cause).toBe(sourceFailure);
    expect(targetResult.id).toBe(CREATED_TASK_ID);
    expect(compensationCause.code).toBe(
      "vault-process-failed",
    );
    expect(compensationCause.cause).toBe(
      compensationFailure,
    );
    expect(processPaths).toEqual([
      PROJECT_PATH,
      FLEETING_PATH,
      PROJECT_PATH,
    ]);
    expect(countTasks(
      readMarkdown(PROJECT_PATH),
      CREATED_TASK_ID,
    )).toBe(1);
    expect(readMarkdown(FLEETING_PATH)).toBe(
      fleetingMarkdown,
    );
  });

  it("preserves the low-level error as the wrapped cause", async () => {
    const { source } = createSource({
      missingPaths: new Set([FLEETING_PATH]),
    });
    const error = await captureError(
      () => convertFleetingNoteToTaskInVault(
        source,
        conversionInput(),
      ),
    );

    const mutationError =
      requireCrossFileMutationError(error);
    const cause = requireTrailMutationError(
      mutationError.cause,
    );

    expect(mutationError.code).toBe(
      "source-remove-failed",
    );
    expect(mutationError.outcome).toBe("compensated");
    expect(cause.code).toBe("fleeting-file-not-found");
  });
});
