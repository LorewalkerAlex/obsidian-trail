import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailProject, TrailTask } from "./domain/trail-model";
import { TrailProjectWorkspace } from "./trail-project-workspace";
import { TrailTaskModalProvider } from "./trail-task-modal-context";

const task: TrailTask = {
  id: "8c774a86-54aa-48d3-9010-99372d0738fc",
  projectId: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  projectPath: "Trail/Areas/Work/Title Lab.md",
  title: "Modal task",
  status: "todo",
  priority: "medium",
  created: "2026-08-07T09:00:00+08:00",
  labels: [],
  subtasks: [],
  notes: [],
  source: {
    filePath: "Trail/Areas/Work/Title Lab.md",
    startOffset: 100,
    endOffset: 220,
    fingerprint: "task-fingerprint",
  },
};

const project: TrailProject = {
  id: task.projectId,
  areaId: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  areaName: "Work",
  name: "Title Lab",
  created: "2026-08-07",
  status: "active",
  overview: "Modal route fixture.",
  tasks: [task],
  notes: [],
  filePath: task.projectPath,
};

describe("Task Modal route", () => {
  it("opens the same Task from Board and List", () => {
    const openTask = vi.fn();
    render(
      <TrailTaskModalProvider openTask={openTask}>
        <TrailProjectWorkspace
          project={project}
          onUpdateTaskStatus={() => Promise.resolve()}
        />
      </TrailTaskModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Open Modal task",
    }));
    expect(openTask).toHaveBeenLastCalledWith(task);

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    fireEvent.click(screen.getByRole("button", {
      name: "Open Modal task",
    }));

    expect(openTask).toHaveBeenCalledTimes(2);
    expect(openTask).toHaveBeenLastCalledWith(task);
  });
});
