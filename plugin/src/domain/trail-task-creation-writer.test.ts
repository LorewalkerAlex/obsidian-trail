import { describe, expect, it } from "vitest";

import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  createBacklogTaskMarkdown,
  removeCreatedTaskMarkdown,
  TrailTaskCreationError,
} from "./trail-task-creation-writer";

const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const EXISTING_TASK_ID =
  "8c774a86-54aa-48d3-9010-99372d0738fc";
const CREATED_TASK_ID =
  "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const CREATED_AT = "2026-08-05T16:20:00+08:00";

const projectMarkdown = [
  "---",
  `id: "${PROJECT_ID}"`,
  "created: 2026-08-04",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "Task creation fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Existing Task <!-- trail:task {"id":"${EXISTING_TASK_ID}","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":[]} -->`,
  "  - Existing Task note.",
  "",
  "## Notes",
  "",
  "- Project note.",
  "",
].join("\n");

const draft = {
  id: CREATED_TASK_ID,
  title: "Converted **Fleeting Note**",
  created: CREATED_AT,
};

describe("Trail Task creation writer", () => {
  it("creates a default backlog Task before Project Notes", () => {
    const updated = createBacklogTaskMarkdown({
      markdown: projectMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const createdTask = requireTask(updated, CREATED_TASK_ID);

    expect(createdTask).toMatchObject({
      title: "Converted **Fleeting Note**",
      status: "backlog",
      priority: "medium",
      created: CREATED_AT,
      labels: [],
      subtasks: [],
      notes: [],
    });
    expect(updated.indexOf(CREATED_TASK_ID)).toBeLessThan(
      updated.indexOf("## Notes"),
    );
  });

  it("is idempotent when the requested Task already exists unchanged", () => {
    const created = createBacklogTaskMarkdown({
      markdown: projectMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const retried = createBacklogTaskMarkdown({
      markdown: created,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });

    expect(retried).toBe(created);
    expect(
      parseProjectTasks(
        { filePath: PROJECT_PATH, markdown: retried },
        PROJECT_ID,
      ).tasks.filter((task) => task.id === CREATED_TASK_ID),
    ).toHaveLength(1);
  });

  it("rejects reuse of the requested UUID by a different Task", () => {
    const conflictingMarkdown = projectMarkdown.replace(
      EXISTING_TASK_ID,
      CREATED_TASK_ID,
    );

    expectCreationError(
      () => createBacklogTaskMarkdown({
        markdown: conflictingMarkdown,
        projectId: PROJECT_ID,
        projectPath: PROJECT_PATH,
        task: draft,
      }),
      "task-id-conflict",
    );
  });

  it("removes the exact created Task for compensation", () => {
    const created = createBacklogTaskMarkdown({
      markdown: projectMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const createdTask = requireTask(created, CREATED_TASK_ID);
    const compensated = removeCreatedTaskMarkdown({
      markdown: created,
      expectedTask: createdTask,
    });

    expect(compensated).toBe(projectMarkdown);
    expect(requireTask(compensated, EXISTING_TASK_ID)).toMatchObject({
      title: "Existing Task",
      notes: [{ text: "Existing Task note." }],
    });
  });

  it("treats an already absent created Task as compensated", () => {
    const created = createBacklogTaskMarkdown({
      markdown: projectMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const createdTask = requireTask(created, CREATED_TASK_ID);

    expect(removeCreatedTaskMarkdown({
      markdown: projectMarkdown,
      expectedTask: createdTask,
    })).toBe(projectMarkdown);
  });

  it("rejects compensation after the created Task changes", () => {
    const created = createBacklogTaskMarkdown({
      markdown: projectMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const createdTask = requireTask(created, CREATED_TASK_ID);
    const changed = created.replace(
      "Converted **Fleeting Note**",
      "Externally changed Task",
    );

    expectCreationError(
      () => removeCreatedTaskMarkdown({
        markdown: changed,
        expectedTask: createdTask,
      }),
      "task-conflict",
    );
  });

  it("preserves CRLF line endings", () => {
    const crlfMarkdown = projectMarkdown.replaceAll("\n", "\r\n");
    const created = createBacklogTaskMarkdown({
      markdown: crlfMarkdown,
      projectId: PROJECT_ID,
      projectPath: PROJECT_PATH,
      task: draft,
    });
    const createdTask = requireTask(created, CREATED_TASK_ID);
    const compensated = removeCreatedTaskMarkdown({
      markdown: created,
      expectedTask: createdTask,
    });

    expect(created).not.toMatch(/(^|[^\r])\n/);
    expect(compensated).toBe(crlfMarkdown);
  });
});

function requireTask(
  markdown: string,
  taskId: string,
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
    throw new Error(`Expected Task ${taskId}.`);
  }

  return task;
}

function expectCreationError(
  action: () => void,
  code: TrailTaskCreationError["code"],
): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(TrailTaskCreationError);
    expect(error).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected Task creation error: ${code}.`);
}
