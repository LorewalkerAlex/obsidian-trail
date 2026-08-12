import { describe, expect, it } from "vitest";

import type { TrailTask } from "./trail-model";
import { parseProjectTasks } from "./trail-parser";
import {
  TrailTaskTitleUpdateError,
  updateTaskTitleMarkdown,
} from "./trail-task-writer";

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
  "Title writer fixture.",
  "",
  "## Tasks",
  "",
  `- [ ] Original title <!-- trail:task {"id":"${TASK_ID}","status":"doing","priority":"high","created":"2026-08-07T09:00:00+08:00","due":"2026-08-10","labels":["type:spike"]} -->`,
  "  - [x] Existing subtask",
  "  - Keep this note unchanged.",
  "",
  "## Notes",
  "",
].join("\n");

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

function expectTitleError(
  action: () => void,
  code: TrailTaskTitleUpdateError["code"],
): void {
  try {
    action();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(TrailTaskTitleUpdateError);
    expect(error).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected Task title writer error: ${code}.`);
}

describe("Trail Task title writer", () => {
  it("changes only the Task title text", () => {
    const expectedTask = requireTask(projectMarkdown);
    const updated = updateTaskTitleMarkdown({
      markdown: projectMarkdown,
      expectedTask,
      title: "Renamed title",
    });
    const updatedTask = requireTask(updated);

    expect(updatedTask).toMatchObject({
      title: "Renamed title",
      status: "doing",
      priority: "high",
      due: "2026-08-10",
      labels: ["type:spike"],
    });
    expect(updated).toContain("  - [x] Existing subtask");
    expect(updated).toContain("  - Keep this note unchanged.");
    expect(updated).toContain('"status":"doing"');
  });

  it("relocates by UUID after earlier content moves offsets", () => {
    const expectedTask = requireTask(projectMarkdown);
    const movedMarkdown = projectMarkdown.replace(
      "Title writer fixture.",
      "Title writer fixture.\n\nExternal text before Tasks.",
    );
    const updated = updateTaskTitleMarkdown({
      markdown: movedMarkdown,
      expectedTask,
      title: "Moved title",
    });

    expect(requireTask(updated).title).toBe("Moved title");
  });

  it("rejects a stale Task fingerprint", () => {
    const expectedTask = requireTask(projectMarkdown);
    const changedMarkdown = projectMarkdown.replace(
      "Keep this note unchanged.",
      "Externally changed note.",
    );

    expectTitleError(
      () => updateTaskTitleMarkdown({
        markdown: changedMarkdown,
        expectedTask,
        title: "Should not overwrite",
      }),
      "task-conflict",
    );
  });

  it("rejects invalid Task titles", () => {
    const expectedTask = requireTask(projectMarkdown);

    for (const title of [
      "   ",
      "Line one\nLine two",
      'Bad <!-- trail:task {"id":"x"} -->',
    ]) {
      expectTitleError(
        () => updateTaskTitleMarkdown({
          markdown: projectMarkdown,
          expectedTask,
          title,
        }),
        "task-title-invalid",
      );
    }
  });
});
