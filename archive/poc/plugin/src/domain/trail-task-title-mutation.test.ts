import { describe, expect, it } from "vitest";

import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  TrailMutationError,
  type TrailMutableFile,
  type TrailMutationSource,
  updateTaskTitleInVault,
} from "./trail-mutation-service";
import { TrailTaskTitleUpdateError } from "./trail-task-writer";

const PROJECT_PATH = "Trail/Areas/Work/Title Lab.md";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const TASK_ID = "8c774a86-54aa-48d3-9010-99372d0738fc";
const projectMarkdown = [
  "---",
  `id: "${PROJECT_ID}"`,
  "created: 2026-08-07",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "Mutation fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Original title <!-- trail:task {"id":"${TASK_ID}","status":"todo","priority":"medium","created":"2026-08-07T09:00:00+08:00","labels":[]} -->`,
  "  - Keep this task note unchanged.",
  "",
  "## Notes",
  "",
  "- Title mutation fixture note.",
  "",
].join("\n");

type TestFile = TrailMutableFile;

function requireTask(markdown: string): TrailTask {
  const result = parseProjectTasks(
    { filePath: PROJECT_PATH, markdown },
    PROJECT_ID,
  );
  expect(result.issues).toEqual([]);
  const task = result.tasks.find((candidate) => candidate.id === TASK_ID);

  if (!task) {
    throw new Error(`Expected Task ${TASK_ID}.`);
  }

  return task;
}

function createSource(
  initialMarkdown: string,
  options: {
    processError?: Error;
    ignoreUpdate?: boolean;
  } = {},
): {
  source: TrailMutationSource<TestFile>;
  readMarkdown: () => string;
} {
  const file = { path: PROJECT_PATH };
  let markdown = initialMarkdown;

  return {
    readMarkdown: () => markdown,
    source: {
      getFileByPath: (path) => path === PROJECT_PATH ? file : null,
      process: async (_file, update) => {
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

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected mutation to fail.");
}

describe("Trail Task title mutation", () => {
  it("writes and returns the reparsed Task", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const currentMarkdown = projectMarkdown.replace(
      "Mutation fixture.",
      "Mutation fixture.\n\nExternal text before Tasks.",
    );
    const { source, readMarkdown } = createSource(currentMarkdown);

    const updatedTask = await updateTaskTitleInVault(source, {
      expectedTask,
      title: "Renamed through Vault.process",
    });

    expect(updatedTask.title).toBe("Renamed through Vault.process");
    expect(updatedTask.source.startOffset).not.toBe(
      expectedTask.source.startOffset,
    );
    expect(readMarkdown()).toContain("External text before Tasks.");
    expect(readMarkdown()).toContain("- [ ] Renamed through Vault.process");
  });

  it("preserves a fingerprint conflict from the title writer", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const changedMarkdown = projectMarkdown.replace(
      "Keep this task note unchanged.",
      "Externally changed note.",
    );
    const { source, readMarkdown } = createSource(changedMarkdown);
    const error = await captureError(() => updateTaskTitleInVault(
      source,
      { expectedTask, title: "Should fail" },
    ));

    expect(error).toBeInstanceOf(TrailTaskTitleUpdateError);
    expect(error).toMatchObject({ code: "task-conflict" });
    expect(readMarkdown()).toBe(changedMarkdown);
  });

  it("wraps a host process failure", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const processError = new Error("Disk write failed.");
    const { source } = createSource(projectMarkdown, { processError });
    const error = await captureError(() => updateTaskTitleInVault(
      source,
      { expectedTask, title: "Renamed title" },
    ));

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "vault-process-failed",
      cause: processError,
    });
  });

  it("rejects a write result that was not persisted", async () => {
    const expectedTask = requireTask(projectMarkdown);
    const { source } = createSource(projectMarkdown, {
      ignoreUpdate: true,
    });
    const error = await captureError(() => updateTaskTitleInVault(
      source,
      { expectedTask, title: "Renamed title" },
    ));

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "write-verification-failed",
    });
  });
});
