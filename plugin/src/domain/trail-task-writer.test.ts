import { describe, expect, it } from "vitest";

import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  TrailTaskStatusUpdateError,
  updateTaskStatusMarkdown,
} from "./trail-task-writer";

const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const PARENT_TASK_ID =
  "fa3b3a46-f818-416a-9dd0-59aa168bc467";
const SIMPLE_TASK_ID =
  "8c774a86-54aa-48d3-9010-99372d0738fc";
const COMPLETED_TASK_ID =
  "991db9cf-a1c0-4346-9537-01c284ee9767";
const COMPLETED_AT = "2026-08-04T16:30:00+08:00";

const projectMarkdown = [
  "---",
  `id: "${PROJECT_ID}"`,
  "created: 2026-08-04",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "Writer fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Parent task <!-- trail:task {"id":"${PARENT_TASK_ID}","status":"doing","priority":"high","created":"2026-08-04T10:00:00+08:00","due":"2026-08-10","labels":["type:spike"]} -->`,
  "  - [x] Complete subtask",
  "  - [ ] Incomplete subtask",
  "  - Keep this task note unchanged.",
  `- [ ] Simple task <!-- trail:task {"id":"${SIMPLE_TASK_ID}","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":["layer:integration"]} -->`,
  `- [x] Completed task <!-- trail:task {"id":"${COMPLETED_TASK_ID}","status":"completed","priority":"low","created":"2026-08-03T09:00:00+08:00","completed":"2026-08-03T18:00:00+08:00","labels":[]} -->`,
  "",
  "## Notes",
  "",
  "- Project note.",
  "",
].join("\n");

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
    throw new Error(`Expected task ${taskId}.`);
  }

  return task;
}

function headerEnd(
  markdown: string,
  task: TrailTask,
): number {
  const newlineOffset = markdown.indexOf(
    "\n",
    task.source.startOffset,
  );

  if (newlineOffset < 0) {
    return markdown.length;
  }

  return markdown[newlineOffset - 1] === "\r"
    ? newlineOffset - 1
    : newlineOffset;
}

function expectTaskError(
  action: () => void,
  code: TrailTaskStatusUpdateError["code"],
): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(
      TrailTaskStatusUpdateError,
    );
    expect(error).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected task writer error: ${code}.`);
}

describe("Trail task status writer", () => {
  it("updates only the target task title line", () => {
    const task = requireTask(projectMarkdown, SIMPLE_TASK_ID);
    const originalHeaderEnd = headerEnd(projectMarkdown, task);
    const updated = updateTaskStatusMarkdown({
      markdown: projectMarkdown,
      expectedTask: task,
      targetStatus: "doing",
    });
    const updatedTask = requireTask(updated, SIMPLE_TASK_ID);
    const updatedHeaderEnd = headerEnd(updated, updatedTask);

    expect(
      updated.slice(0, task.source.startOffset),
    ).toBe(
      projectMarkdown.slice(0, task.source.startOffset),
    );
    expect(updated.slice(updatedHeaderEnd)).toBe(
      projectMarkdown.slice(originalHeaderEnd),
    );
    expect(
      updated.slice(
        updatedTask.source.startOffset,
        updatedHeaderEnd,
      ),
    ).toContain('"status":"doing"');
    expect(updatedTask).toMatchObject({
      status: "doing",
      completed: undefined,
      title: "Simple task",
    });
  });

  it("completes a task with a stable timestamp", () => {
    const task = requireTask(projectMarkdown, SIMPLE_TASK_ID);
    const updated = updateTaskStatusMarkdown({
      markdown: projectMarkdown,
      expectedTask: task,
      targetStatus: "completed",
      completedAt: COMPLETED_AT,
    });
    const updatedTask = requireTask(updated, SIMPLE_TASK_ID);

    expect(updatedTask).toMatchObject({
      status: "completed",
      completed: COMPLETED_AT,
    });
    expect(
      updated.slice(
        updatedTask.source.startOffset,
        headerEnd(updated, updatedTask),
      ),
    ).toContain("- [x] Simple task");
  });

  it("rejects completion with an incomplete subtask", () => {
    const task = requireTask(projectMarkdown, PARENT_TASK_ID);

    expectTaskError(
      () => updateTaskStatusMarkdown({
        markdown: projectMarkdown,
        expectedTask: task,
        targetStatus: "completed",
        completedAt: COMPLETED_AT,
      }),
      "task-completion-blocked",
    );
  });

  it("reopens a completed task and removes completed", () => {
    const task = requireTask(
      projectMarkdown,
      COMPLETED_TASK_ID,
    );
    const updated = updateTaskStatusMarkdown({
      markdown: projectMarkdown,
      expectedTask: task,
      targetStatus: "todo",
    });
    const updatedTask = requireTask(
      updated,
      COMPLETED_TASK_ID,
    );

    expect(updatedTask).toMatchObject({
      status: "todo",
      completed: undefined,
    });
    expect(
      updated.slice(
        updatedTask.source.startOffset,
        headerEnd(updated, updatedTask),
      ),
    ).toContain("- [ ] Completed task");
  });

  it("relocates the task by UUID after earlier text moves offsets", () => {
    const task = requireTask(projectMarkdown, SIMPLE_TASK_ID);
    const movedMarkdown = projectMarkdown.replace(
      "Writer fixture.",
      "Writer fixture.\n\nExternal text above Tasks.",
    );
    const updated = updateTaskStatusMarkdown({
      markdown: movedMarkdown,
      expectedTask: task,
      targetStatus: "doing",
    });

    expect(requireTask(updated, SIMPLE_TASK_ID).status).toBe(
      "doing",
    );
  });

  it("rejects a write when the target task block changed", () => {
    const task = requireTask(projectMarkdown, SIMPLE_TASK_ID);
    const changedMarkdown = projectMarkdown.replace(
      "Simple task",
      "Externally edited task",
    );

    expectTaskError(
      () => updateTaskStatusMarkdown({
        markdown: changedMarkdown,
        expectedTask: task,
        targetStatus: "doing",
      }),
      "task-conflict",
    );
  });

  it("preserves CRLF line endings", () => {
    const crlfMarkdown = projectMarkdown.replaceAll(
      "\n",
      "\r\n",
    );
    const task = requireTask(crlfMarkdown, SIMPLE_TASK_ID);
    const updated = updateTaskStatusMarkdown({
      markdown: crlfMarkdown,
      expectedTask: task,
      targetStatus: "doing",
    });

    expect(updated).not.toMatch(/(^|[^\r])\n/);
    expect(requireTask(updated, SIMPLE_TASK_ID).status).toBe(
      "doing",
    );
  });

  it("reports a missing source fingerprint", () => {
    const task = requireTask(projectMarkdown, SIMPLE_TASK_ID);
    const incompleteTask = {
      ...task,
      source: {
        ...task.source,
        fingerprint: undefined,
      },
    };

    expectTaskError(
      () => updateTaskStatusMarkdown({
        markdown: projectMarkdown,
        expectedTask: incompleteTask,
        targetStatus: "doing",
      }),
      "source-fingerprint-missing",
    );
  });
});
