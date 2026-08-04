import { describe, expect, it } from "vitest";

import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  TrailMutationError,
  type TrailMutableFile,
  type TrailMutationSource,
  updateTaskStatusInVault,
} from "./trail-mutation-service";
import { TrailTaskStatusUpdateError } from "./trail-task-writer";

const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const TASK_ID = "8c774a86-54aa-48d3-9010-99372d0738fc";
const COMPLETED_AT = "2026-08-04T16:45:00+08:00";

const projectMarkdown = [
  "---",
  `id: "${PROJECT_ID}"`,
  "created: 2026-08-04",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "Mutation fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Write through Vault.process <!-- trail:task {"id":"${TASK_ID}","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":[]} -->`,
  "  - Keep this task note unchanged.",
  "",
  "## Notes",
  "",
  "- Project note.",
  "",
].join("\n");

type TestFile = TrailMutableFile;

interface TestSourceOptions {
  fileExists?: boolean;
  ignoreUpdate?: boolean;
  processError?: Error;
}

interface TestSource {
  source: TrailMutationSource<TestFile>;
  processPaths: string[];
  readMarkdown: () => string;
}

function createSource(
  initialMarkdown: string,
  options: TestSourceOptions = {},
): TestSource {
  const file: TestFile = { path: PROJECT_PATH };
  const processPaths: string[] = [];
  let markdown = initialMarkdown;

  return {
    processPaths,
    readMarkdown: () => markdown,
    source: {
      getFileByPath: (path) =>
        options.fileExists === false
        || path !== PROJECT_PATH
          ? null
          : file,

      process: async (target, update) => {
        processPaths.push(target.path);

        if (options.processError) {
          throw options.processError;
        }

        const updated = update(markdown);

        if (!options.ignoreUpdate) {
          markdown = updated;
        }

        return markdown;
      },
    },
  };
}

function requireTask(
  markdown: string,
): TrailTask {
  const result = parseProjectTasks(
    {
      filePath: PROJECT_PATH,
      markdown,
    },
    PROJECT_ID,
  );
  const task = result.tasks.find(
    (candidate) => candidate.id === TASK_ID,
  );

  expect(result.issues).toEqual([]);

  if (!task) {
    throw new Error(`Expected task ${TASK_ID}.`);
  }

  return task;
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected the mutation to fail.");
}

describe("Trail mutation service", () => {
  it("uses current Vault content and returns the reparsed Task", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const currentMarkdown = projectMarkdown.replace(
      "Mutation fixture.",
      "Mutation fixture.\n\nExternal text before Tasks.",
    );
    const { source, processPaths, readMarkdown } =
      createSource(currentMarkdown);

    const updatedTask = await updateTaskStatusInVault(
      source,
      {
        expectedTask,
        targetStatus: "doing",
      },
    );

    expect(processPaths).toEqual([PROJECT_PATH]);
    expect(updatedTask.status).toBe("doing");
    expect(updatedTask.source.startOffset).not.toBe(
      expectedTask.source.startOffset,
    );
    expect(readMarkdown()).toContain(
      "External text before Tasks.",
    );
    expect(readMarkdown()).toContain(
      '"status":"doing"',
    );
  });

  it("passes completion time through the atomic write", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const { source, readMarkdown } =
      createSource(projectMarkdown);

    const updatedTask = await updateTaskStatusInVault(
      source,
      {
        expectedTask,
        targetStatus: "completed",
        completedAt: COMPLETED_AT,
      },
    );

    expect(updatedTask).toMatchObject({
      status: "completed",
      completed: COMPLETED_AT,
    });
    expect(readMarkdown()).toContain(
      "- [x] Write through Vault.process",
    );
  });

  it("reports a missing Project file before processing", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const { source, processPaths } = createSource(
      projectMarkdown,
      { fileExists: false },
    );
    const error = await captureError(
      () => updateTaskStatusInVault(source, {
        expectedTask,
        targetStatus: "doing",
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "project-file-not-found",
    });
    expect(processPaths).toEqual([]);
  });

  it("preserves a Fingerprint conflict from the domain writer", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const changedMarkdown = projectMarkdown.replace(
      "Write through Vault.process",
      "Externally changed task",
    );
    const { source, readMarkdown } =
      createSource(changedMarkdown);
    const error = await captureError(
      () => updateTaskStatusInVault(source, {
        expectedTask,
        targetStatus: "doing",
      }),
    );

    expect(error).toBeInstanceOf(
      TrailTaskStatusUpdateError,
    );
    expect(error).toMatchObject({ code: "task-conflict" });
    expect(readMarkdown()).toBe(changedMarkdown);
  });

  it("wraps an Obsidian process failure", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const processError = new Error("Disk write failed.");
    const { source } = createSource(projectMarkdown, {
      processError,
    });
    const error = await captureError(
      () => updateTaskStatusInVault(source, {
        expectedTask,
        targetStatus: "doing",
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "vault-process-failed",
      cause: processError,
    });
  });

  it("rejects a write result that does not contain the target state", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const { source } = createSource(projectMarkdown, {
      ignoreUpdate: true,
    });
    const error = await captureError(
      () => updateTaskStatusInVault(source, {
        expectedTask,
        targetStatus: "doing",
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "write-verification-failed",
    });
  });
});
