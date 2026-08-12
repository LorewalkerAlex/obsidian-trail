import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  TrailProject,
  TrailTask,
  TrailTaskStatus,
} from "./domain/trail-model";
import {
  TrailProjectWorkspace,
  sortTrailTasks,
} from "./trail-project-workspace";

const baseTask: TrailTask = {
  id: "fa3b3a46-f818-416a-9dd0-59aa168bc467",
  projectId: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  projectPath: "Trail/Areas/Work/Trail POC.md",
  title: "Build the Trail parser",
  status: "todo",
  priority: "high",
  created: "2026-08-04T10:00:00+08:00",
  due: "2026-08-10",
  labels: ["type:spike"],
  subtasks: [],
  notes: [],
  source: {
    filePath: "Trail/Areas/Work/Trail POC.md",
    startOffset: 100,
    endOffset: 200,
    fingerprint: "task-fingerprint",
  },
};

const project: TrailProject = {
  id: baseTask.projectId,
  areaId: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  areaName: "Work",
  name: "Trail POC",
  created: "2026-08-04",
  status: "active",
  overview: "Validate the Project workspace.",
  tasks: [baseTask],
  notes: [{ text: "Keep the Markdown source authoritative." }],
  filePath: baseTask.projectPath,
};

function createDataTransfer(): DataTransfer {
  const values = new Map<string, string>();
  const dataTransfer = {
    dropEffect: "none",
    effectAllowed: "uninitialized",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as string[],
    clearData: (format?: string) => {
      if (format === undefined) {
        values.clear();
      } else {
        values.delete(format);
      }
    },
    getData: (format: string) => values.get(format) ?? "",
    setData: (format: string, value: string) => {
      values.set(format, value);
    },
    setDragImage: () => undefined,
  };

  return dataTransfer as unknown as DataTransfer;
}

function getStatusColumn(statusLabel: string): HTMLElement {
  return screen.getByRole("region", {
    name: `${statusLabel} Tasks`,
  });
}

function dragTaskTo(
  taskTitle: string,
  statusLabel: string,
): void {
  const dataTransfer = createDataTransfer();
  const card = screen.getByRole("article", {
    name: `${taskTitle} Task`,
  });
  const column = getStatusColumn(statusLabel);

  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragOver(column, { dataTransfer });
  fireEvent.drop(column, { dataTransfer });
}

describe("TrailProjectWorkspace", () => {
  it("renders five Board columns and switches to the same Task List", () => {
    render(
      <TrailProjectWorkspace
        project={project}
        onUpdateTaskStatus={() => Promise.resolve()}
      />,
    );

    for (const label of [
      "Backlog",
      "Todo",
      "Doing",
      "Blocked",
      "Completed",
    ]) {
      expect(getStatusColumn(label)).toBeInTheDocument();
    }

    expect(
      within(getStatusColumn("Todo")).getByRole("article", {
        name: `${baseTask.title} Task`,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "List",
    }));

    expect(screen.getByRole("list", {
      name: `${project.name} Task List`,
    })).toHaveTextContent(baseTask.title);
    expect(screen.getByRole("combobox", {
      name: `Status for ${baseTask.title}`,
    })).toHaveValue("todo");
  });

  it("sorts Tasks by priority, due date, created time, and id", () => {
    const tasks: TrailTask[] = [
      {
        ...baseTask,
        id: "task-low",
        title: "Low priority",
        priority: "low",
        due: "2026-08-01",
      },
      {
        ...baseTask,
        id: "task-urgent-late",
        title: "Urgent later due",
        priority: "urgent",
        due: "2026-08-20",
      },
      {
        ...baseTask,
        id: "task-urgent-early-new",
        title: "Urgent early newer",
        priority: "urgent",
        due: "2026-08-05",
        created: "2026-08-04T11:00:00+08:00",
      },
      {
        ...baseTask,
        id: "task-urgent-early-old",
        title: "Urgent early older",
        priority: "urgent",
        due: "2026-08-05",
        created: "2026-08-04T09:00:00+08:00",
      },
    ];

    expect(sortTrailTasks(tasks).map((task) => task.title)).toEqual([
      "Urgent early older",
      "Urgent early newer",
      "Urgent later due",
      "Low priority",
    ]);
  });

  it("moves a Task optimistically during a cross-column drag", async () => {
    let resolveUpdate: (() => void) | undefined;
    const update = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    const onUpdateTaskStatus = vi.fn(() => update);

    render(
      <TrailProjectWorkspace
        project={project}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />,
    );

    dragTaskTo(baseTask.title, "Doing");

    expect(onUpdateTaskStatus).toHaveBeenCalledWith(
      baseTask,
      "doing",
    );
    expect(
      within(getStatusColumn("Todo")).queryByRole("article", {
        name: `${baseTask.title} Task`,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(getStatusColumn("Doing")).getByRole("article", {
        name: `${baseTask.title} Task`,
      }),
    ).toHaveAttribute("aria-busy", "true");

    if (!resolveUpdate) {
      throw new Error("The Task update did not start.");
    }
    resolveUpdate();

    await waitFor(() => {
      expect(screen.getByRole("article", {
        name: `${baseTask.title} Task`,
      })).toHaveAttribute("aria-busy", "false");
    });
  });

  it("rolls a failed drag back to the confirmed status", async () => {
    const onUpdateTaskStatus = vi.fn(() =>
      Promise.reject(
        new Error("The task changed after it was read."),
      ));

    render(
      <TrailProjectWorkspace
        project={project}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />,
    );

    dragTaskTo(baseTask.title, "Doing");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Task update failed: The task changed after it was read.",
    );
    expect(
      within(getStatusColumn("Todo")).getByRole("article", {
        name: `${baseTask.title} Task`,
      }),
    ).toBeInTheDocument();
    expect(
      within(getStatusColumn("Doing")).queryByRole("article", {
        name: `${baseTask.title} Task`,
      }),
    ).not.toBeInTheDocument();
  });

  it(
    "rolls back when an incomplete Subtask blocks completion",
    async () => {
      const taskWithIncompleteSubtask: TrailTask = {
        ...baseTask,
        subtasks: [
          { text: "Completed child", completed: true },
          { text: "Incomplete child", completed: false },
        ],
      };
      const onUpdateTaskStatus = vi.fn((
        _task: TrailTask,
        targetStatus: TrailTaskStatus,
      ) => targetStatus === "completed"
        ? Promise.reject(
          new Error(
            "A Task with incomplete Subtasks cannot be completed.",
          ),
        )
        : Promise.resolve());

      render(
        <TrailProjectWorkspace
          project={{
            ...project,
            tasks: [taskWithIncompleteSubtask],
          }}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />,
      );

      dragTaskTo(
        taskWithIncompleteSubtask.title,
        "Completed",
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "A Task with incomplete Subtasks cannot be completed.",
      );
      expect(
        within(getStatusColumn("Todo")).getByRole("article", {
          name: `${taskWithIncompleteSubtask.title} Task`,
        }),
      ).toHaveTextContent("Subtasks: 1/2");
    },
  );

  it("uses the List status select as the same update path", () => {
    const pendingUpdate = new Promise<void>(() => undefined);
    const onUpdateTaskStatus = vi.fn(() => pendingUpdate);

    render(
      <TrailProjectWorkspace
        project={project}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "List",
    }));
    fireEvent.change(screen.getByRole("combobox", {
      name: `Status for ${baseTask.title}`,
    }), {
      target: { value: "blocked" },
    });

    expect(onUpdateTaskStatus).toHaveBeenCalledWith(
      baseTask,
      "blocked",
    );
    expect(screen.getByRole("combobox", {
      name: `Status for ${baseTask.title}`,
    })).toHaveValue("blocked");
  });

  it(
    "clears an optimistic override after the Store confirms it",
    async () => {
      const onUpdateTaskStatus = vi.fn(() => Promise.resolve());
      const { rerender } = render(
        <TrailProjectWorkspace
          project={project}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />,
      );

      dragTaskTo(baseTask.title, "Doing");

      await waitFor(() => {
        expect(screen.getByRole("article", {
          name: `${baseTask.title} Task`,
        })).toHaveAttribute("aria-busy", "false");
      });

      rerender(
        <TrailProjectWorkspace
          project={{
            ...project,
            tasks: [{ ...baseTask, status: "doing" }],
          }}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />,
      );

      rerender(
        <TrailProjectWorkspace
          project={{
            ...project,
            tasks: [{ ...baseTask, status: "blocked" }],
          }}
          onUpdateTaskStatus={onUpdateTaskStatus}
        />,
      );

      await waitFor(() => {
        expect(
          within(getStatusColumn("Blocked")).getByRole(
            "article",
            { name: `${baseTask.title} Task` },
          ),
        ).toBeInTheDocument();
      });
    },
  );

  it(
    "does not leak a late failure into another Project",
    async () => {
      let rejectUpdate: ((error: Error) => void) | undefined;
      const pendingUpdate = new Promise<void>((_resolve, reject) => {
        rejectUpdate = reject;
      });
      const secondProject: TrailProject = {
        ...project,
        id: "52d0ba61-09a6-4b9d-b97a-c15d09c12683",
        name: "Second Project",
        tasks: [],
        filePath: "Trail/Areas/Work/Second Project.md",
      };
      const { rerender } = render(
        <TrailProjectWorkspace
          project={project}
          onUpdateTaskStatus={() => pendingUpdate}
        />,
      );

      fireEvent.change(screen.getByRole("combobox", {
        name: `Status for ${baseTask.title}`,
      }), {
        target: { value: "doing" },
      });

      rerender(
        <TrailProjectWorkspace
          project={secondProject}
          onUpdateTaskStatus={() => pendingUpdate}
        />,
      );

      if (!rejectUpdate) {
        throw new Error("The Task update did not start.");
      }
      rejectUpdate(
        new Error("Late failure from the first Project."),
      );

      await waitFor(() => {
        expect(screen.getByRole("heading", {
          name: secondProject.name,
        })).toBeInTheDocument();
        expect(screen.queryByRole("alert"))
          .not.toBeInTheDocument();
      });
    },
  );

  it(
    "keeps other Task controls available while one update is pending",
    () => {
      const secondTask: TrailTask = {
        ...baseTask,
        id: "8c774a86-54aa-48d3-9010-99372d0738fc",
        title: "Test the mutation queue",
        source: {
          ...baseTask.source,
          startOffset: 200,
          endOffset: 300,
        },
      };
      const pendingUpdate = new Promise<void>(() => undefined);

      render(
        <TrailProjectWorkspace
          project={{ ...project, tasks: [baseTask, secondTask] }}
          onUpdateTaskStatus={() => pendingUpdate}
        />,
      );

      fireEvent.change(screen.getByRole("combobox", {
        name: `Status for ${baseTask.title}`,
      }), {
        target: { value: "doing" },
      });

      expect(screen.getByRole("combobox", {
        name: `Status for ${baseTask.title}`,
      })).toBeDisabled();
      expect(screen.getByRole("combobox", {
        name: `Status for ${secondTask.title}`,
      })).toBeEnabled();
    },
  );
});
