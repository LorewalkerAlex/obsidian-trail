import { describe, expect, it } from "vitest";

import type {
  TrailFleetingNote,
  TrailTask,
} from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import { parseProjectTasks } from "./trail-parser";
import {
  createBacklogTaskInVault,
  removeCreatedTaskInVault,
  removeFleetingNoteInVault,
  TrailMutationError,
  type TrailMutableFile,
  type TrailMutationSource,
  updateTaskStatusInVault,
} from "./trail-mutation-service";
import { TrailFleetingNoteRemovalError } from "./trail-fleeting-note-writer";
import { TrailTaskCreationError } from "./trail-task-creation-writer";
import { TrailTaskStatusUpdateError } from "./trail-task-writer";

const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const TASK_ID = "8c774a86-54aa-48d3-9010-99372d0738fc";
const CREATED_TASK_ID =
  "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const COMPLETED_AT = "2026-08-04T16:45:00+08:00";
const CREATED_AT = "2026-08-05T16:20:00+08:00";
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

const backlogTaskDraft = {
  id: CREATED_TASK_ID,
  title: "Converted **Fleeting Note**",
  created: CREATED_AT,
};

const fleetingLine =
  `- Convert this note <!-- trail:fleeting {"id":"${FLEETING_ID}","created":"${FLEETING_CREATED_AT}"} -->`;
const otherFleetingLine =
  `- Keep this note <!-- trail:fleeting {"id":"${OTHER_FLEETING_ID}","created":"${OTHER_FLEETING_CREATED_AT}"} -->`;
const fleetingMarkdown = [
  fleetingLine,
  otherFleetingLine,
  "",
].join("\n");

type TestFile = TrailMutableFile;

interface TestSourceOptions {
  fileExists?: boolean;
  ignoreUpdate?: boolean;
  processError?: Error;
  filePath?: string;
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
  const filePath = options.filePath ?? PROJECT_PATH;
  const file: TestFile = { path: filePath };
  const processPaths: string[] = [];
  let markdown = initialMarkdown;

  return {
    processPaths,
    readMarkdown: () => markdown,
    source: {
      getFileByPath: (path) =>
        options.fileExists === false
        || path !== filePath
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
  taskId = TASK_ID,
): TrailTask {
  const result = parseProjectTasks(
    {
      filePath: PROJECT_PATH,
      markdown,
    },
    PROJECT_ID,
  );
  const task = result.tasks.find(
    (candidate) => candidate.id === taskId,
  );

  expect(result.issues).toEqual([]);

  if (!task) {
    throw new Error(`Expected task ${taskId}.`);
  }

  return task;
}

function requireFleetingNote(
  markdown: string,
  noteId = FLEETING_ID,
): TrailFleetingNote {
  const result = parseFleetingNotes({
    filePath: FLEETING_PATH,
    markdown,
  });
  const note = result.notes.find(
    (candidate) => candidate.id === noteId,
  );

  expect(result.issues).toEqual([]);

  if (!note) {
    throw new Error(
      `Expected Fleeting Note ${noteId}.`,
    );
  }

  return note;
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
    (candidate) => candidate.id === taskId,
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

  it("preserves a Fingerprint conflict from the status writer", async () => {
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

  it("creates a Backlog Task from current Project content", async () => {
    const currentMarkdown = projectMarkdown.replace(
      "Mutation fixture.",
      "Mutation fixture.\n\nExternal Project edit.",
    );
    const { source, processPaths, readMarkdown } =
      createSource(currentMarkdown);

    const createdTask = await createBacklogTaskInVault(
      source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );

    expect(processPaths).toEqual([PROJECT_PATH]);
    expect(createdTask).toMatchObject({
      id: CREATED_TASK_ID,
      title: "Converted **Fleeting Note**",
      status: "backlog",
      priority: "medium",
      created: CREATED_AT,
    });
    expect(readMarkdown()).toContain(
      "External Project edit.",
    );
    expect(countTasks(
      readMarkdown(),
      CREATED_TASK_ID,
    )).toBe(1);
  });

  it("is idempotent when Task creation is retried", async () => {
    const { source, readMarkdown } =
      createSource(projectMarkdown);

    const firstTask = await createBacklogTaskInVault(
      source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );
    const secondTask = await createBacklogTaskInVault(
      source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );

    expect(secondTask.source.fingerprint).toBe(
      firstTask.source.fingerprint,
    );
    expect(countTasks(
      readMarkdown(),
      CREATED_TASK_ID,
    )).toBe(1);
  });

  it("preserves a UUID conflict from the creation writer", async () => {
    const conflictingMarkdown = projectMarkdown.replace(
      TASK_ID,
      CREATED_TASK_ID,
    );
    const { source, readMarkdown } =
      createSource(conflictingMarkdown);
    const error = await captureError(
      () => createBacklogTaskInVault(source, {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      }),
    );

    expect(error).toBeInstanceOf(TrailTaskCreationError);
    expect(error).toMatchObject({
      code: "task-id-conflict",
    });
    expect(readMarkdown()).toBe(conflictingMarkdown);
  });

  it("wraps a process failure during Task creation", async () => {
    const processError = new Error("Disk write failed.");
    const { source } = createSource(projectMarkdown, {
      processError,
    });
    const error = await captureError(
      () => createBacklogTaskInVault(source, {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "vault-process-failed",
      cause: processError,
    });
  });

  it("rejects Task creation that was not persisted", async () => {
    const { source } = createSource(projectMarkdown, {
      ignoreUpdate: true,
    });
    const error = await captureError(
      () => createBacklogTaskInVault(source, {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "write-verification-failed",
    });
  });

  it("removes the created Task and verifies compensation", async () => {
    const { source, readMarkdown } =
      createSource(projectMarkdown);
    const createdTask = await createBacklogTaskInVault(
      source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );

    await removeCreatedTaskInVault(source, {
      expectedTask: createdTask,
    });

    expect(readMarkdown()).toBe(projectMarkdown);
    expect(countTasks(
      readMarkdown(),
      CREATED_TASK_ID,
    )).toBe(0);
  });

  it("treats an already absent created Task as compensated", async () => {
    const createdMarkdown = createSource(projectMarkdown);
    const createdTask = await createBacklogTaskInVault(
      createdMarkdown.source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );
    const absentSource = createSource(projectMarkdown);

    await expect(removeCreatedTaskInVault(
      absentSource.source,
      { expectedTask: createdTask },
    )).resolves.toBeUndefined();
    expect(absentSource.readMarkdown()).toBe(projectMarkdown);
  });

  it("preserves a Fingerprint conflict during compensation", async () => {
    const createdSource = createSource(projectMarkdown);
    const createdTask = await createBacklogTaskInVault(
      createdSource.source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );
    const changedMarkdown = createdSource.readMarkdown().replace(
      "Converted **Fleeting Note**",
      "Externally changed Task",
    );
    const changedSource = createSource(changedMarkdown);
    const error = await captureError(
      () => removeCreatedTaskInVault(
        changedSource.source,
        { expectedTask: createdTask },
      ),
    );

    expect(error).toBeInstanceOf(TrailTaskCreationError);
    expect(error).toMatchObject({ code: "task-conflict" });
    expect(changedSource.readMarkdown()).toBe(changedMarkdown);
  });

  it("rejects compensation that was not persisted", async () => {
    const createdSource = createSource(projectMarkdown);
    const createdTask = await createBacklogTaskInVault(
      createdSource.source,
      {
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: backlogTaskDraft,
      },
    );
    const ignoredSource = createSource(
      createdSource.readMarkdown(),
      { ignoreUpdate: true },
    );
    const error = await captureError(
      () => removeCreatedTaskInVault(
        ignoredSource.source,
        { expectedTask: createdTask },
      ),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "write-verification-failed",
    });
  });

  it("removes a Fleeting Note through the current Vault content", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const currentMarkdown = fleetingMarkdown.replace(
      `${otherFleetingLine}\n`,
      `- External note without Trail metadata\n${otherFleetingLine}\n`,
    );
    const { source, processPaths, readMarkdown } =
      createSource(currentMarkdown, {
        filePath: FLEETING_PATH,
      });

    await removeFleetingNoteInVault(source, {
      expectedNote,
    });

    expect(processPaths).toEqual([FLEETING_PATH]);
    expect(readMarkdown()).not.toContain(FLEETING_ID);
    expect(readMarkdown()).toContain(
      "External note without Trail metadata",
    );
    expect(readMarkdown()).toContain(
      OTHER_FLEETING_ID,
    );
  });

  it("treats an already absent Fleeting Note as removed", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const remainingMarkdown = `${otherFleetingLine}\n`;
    const { source, readMarkdown } = createSource(
      remainingMarkdown,
      { filePath: FLEETING_PATH },
    );

    await expect(removeFleetingNoteInVault(
      source,
      { expectedNote },
    )).resolves.toBeUndefined();
    expect(readMarkdown()).toBe(remainingMarkdown);
  });

  it("reports a missing Fleeting Notes file before processing", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const { source, processPaths } = createSource(
      fleetingMarkdown,
      {
        fileExists: false,
        filePath: FLEETING_PATH,
      },
    );
    const error = await captureError(
      () => removeFleetingNoteInVault(source, {
        expectedNote,
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "fleeting-file-not-found",
    });
    expect(processPaths).toEqual([]);
  });

  it("preserves a Fleeting Note Fingerprint conflict", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const changedMarkdown = fleetingMarkdown.replace(
      "Convert this note",
      "Externally changed Fleeting Note",
    );
    const { source, readMarkdown } = createSource(
      changedMarkdown,
      { filePath: FLEETING_PATH },
    );
    const error = await captureError(
      () => removeFleetingNoteInVault(source, {
        expectedNote,
      }),
    );

    expect(error).toBeInstanceOf(
      TrailFleetingNoteRemovalError,
    );
    expect(error).toMatchObject({
      code: "fleeting-note-conflict",
    });
    expect(readMarkdown()).toBe(changedMarkdown);
  });

  it("wraps a process failure during Fleeting Note removal", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const processError = new Error("Disk write failed.");
    const { source } = createSource(
      fleetingMarkdown,
      {
        processError,
        filePath: FLEETING_PATH,
      },
    );
    const error = await captureError(
      () => removeFleetingNoteInVault(source, {
        expectedNote,
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "vault-process-failed",
      cause: processError,
    });
  });

  it("rejects Fleeting Note removal that was not persisted", async () => {
    const expectedNote = requireFleetingNote(
      fleetingMarkdown,
    );
    const { source } = createSource(
      fleetingMarkdown,
      {
        ignoreUpdate: true,
        filePath: FLEETING_PATH,
      },
    );
    const error = await captureError(
      () => removeFleetingNoteInVault(source, {
        expectedNote,
      }),
    );

    expect(error).toBeInstanceOf(TrailMutationError);
    expect(error).toMatchObject({
      code: "write-verification-failed",
    });
  });

});
