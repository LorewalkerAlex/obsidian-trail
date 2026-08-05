import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  TrailTask,
} from "./domain/trail-model";
import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
import {
  TrailApp,
  type TrailAppProps,
} from "./trail-app";

const data: TrailVaultReadResult = {
  areas: [
    {
      id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
      name: "Work",
      created: "2026-08-04",
      description: "Work Area",
      filePath: "Trail/Areas/Work/Area.md",
    },
  ],
  projects: [
    {
      id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
      areaId: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
      areaName: "Work",
      name: "Trail POC",
      created: "2026-08-04",
      status: "active",
      overview: "Validate the Markdown reading path.",
      tasks: [
        {
          id: "fa3b3a46-f818-416a-9dd0-59aa168bc467",
          projectId:
            "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
          projectPath:
            "Trail/Areas/Work/Trail POC.md",
          title: "Build the Trail parser",
          status: "doing",
          priority: "high",
          created: "2026-08-04T10:00:00+08:00",
          labels: ["type:spike"],
          subtasks: [
            {
              text: "Define the fixture",
              completed: true,
            },
            {
              text: "Validate issue isolation",
              completed: false,
            },
          ],
          notes: [
            {
              text: "Read again after cache update.",
            },
          ],
          source: {
            filePath:
              "Trail/Areas/Work/Trail POC.md",
            startOffset: 100,
            endOffset: 200,
          },
        },
      ],
      notes: [
        {
          text: "The POC is read-only.",
        },
      ],
      filePath:
        "Trail/Areas/Work/Trail POC.md",
    },
  ],
  issues: [],
};

const todoTask: TrailTask = {
  ...data.projects[0].tasks[0],
  status: "todo",
  subtasks: [],
};

const todoData: TrailVaultReadResult = {
  ...data,
  projects: [
    {
      ...data.projects[0],
      tasks: [todoTask],
    },
  ],
};

const secondTodoTask: TrailTask = {
  ...todoTask,
  id: "8c774a86-54aa-48d3-9010-99372d0738fc",
  title: "Test the mutation queue",
  source: {
    ...todoTask.source,
    startOffset: 200,
    endOffset: 300,
  },
};

const twoTodoTaskData: TrailVaultReadResult = {
  ...data,
  projects: [
    {
      ...data.projects[0],
      tasks: [
        todoTask,
        secondTodoTask,
      ],
    },
  ],
};

function renderTrailApp(
  appData: TrailVaultReadResult = data,
  onUpdateTaskStatus: TrailAppProps["onUpdateTaskStatus"] =
    () => Promise.resolve(),
): void {
  render(
    <TrailApp
      data={appData}
      onUpdateTaskStatus={onUpdateTaskStatus}
    />,
  );
}

function openProjectPage(): void {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Project",
    }),
  );
}

describe("TrailApp", () => {
  it("renders the four top-level page controls", () => {
    renderTrailApp();

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Areas",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Project",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Fleeting Notes",
      }),
    ).toBeInTheDocument();
  });

  it("shows the parsed data summary", () => {
    renderTrailApp();

    expect(
      screen.getByRole("heading", {
        name: "Dashboard",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 Area · 1 Project · 1 Task",
      ),
    ).toBeInTheDocument();
  });

  it("shows Areas and their Projects", () => {
    renderTrailApp();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Areas",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Areas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(
      screen.getByText("Trail POC"),
    ).toBeInTheDocument();
  });

  it("shows the first parsed Project", () => {
    renderTrailApp();
    openProjectPage();

    expect(
      screen.getByRole("heading", {
        name: "Trail POC",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Build the Trail parser (doing)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[x] Define the fixture"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[ ] Validate issue isolation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Read again after cache update.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The POC is read-only."),
    ).toBeInTheDocument();
  });

  it("requests a todo to doing Task status update", async () => {
    const onUpdateTaskStatus = vi.fn(
      () => Promise.resolve(),
    );

    renderTrailApp(todoData, onUpdateTaskStatus);
    openProjectPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark Build the Trail parser as doing",
      }),
    );

    await waitFor(() => {
      expect(onUpdateTaskStatus).toHaveBeenCalledOnce();
    });
    expect(onUpdateTaskStatus).toHaveBeenCalledWith(
      todoTask,
      "doing",
    );
  });

  it("requests a doing to todo Task status update", async () => {
    const onUpdateTaskStatus = vi.fn(
      () => Promise.resolve(),
    );
    const doingTask = data.projects[0].tasks[0];

    renderTrailApp(data, onUpdateTaskStatus);
    openProjectPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark Build the Trail parser as todo",
      }),
    );

    await waitFor(() => {
      expect(onUpdateTaskStatus).toHaveBeenCalledOnce();
    });
    expect(onUpdateTaskStatus).toHaveBeenCalledWith(
      doingTask,
      "todo",
    );
  });

  it("keeps another Task action available while one is pending", async () => {
    let resolveFirstUpdate:
      | (() => void)
      | undefined;

    const firstUpdate = new Promise<void>((resolve) => {
      resolveFirstUpdate = resolve;
    });
    const onUpdateTaskStatus = vi.fn()
      .mockReturnValueOnce(firstUpdate)
      .mockResolvedValueOnce(undefined);

    renderTrailApp(
      twoTodoTaskData,
      onUpdateTaskStatus,
    );
    openProjectPage();

    const firstButton = screen.getByRole("button", {
      name: "Mark Build the Trail parser as doing",
    });
    const secondButton = screen.getByRole("button", {
      name: "Mark Test the mutation queue as doing",
    });

    fireEvent.click(firstButton);

    expect(firstButton).toBeDisabled();
    expect(secondButton).toBeEnabled();

    fireEvent.click(secondButton);

    await waitFor(() => {
      expect(onUpdateTaskStatus).toHaveBeenCalledTimes(2);
    });

    if (!resolveFirstUpdate) {
      throw new Error(
        "The first Task update did not start.",
      );
    }

    resolveFirstUpdate();

    await waitFor(() => {
      expect(firstButton).toBeEnabled();
    });
  });

  it("shows a Task update failure", async () => {
    const onUpdateTaskStatus = vi.fn(
      () => Promise.reject(
        new Error("The task changed after it was read."),
      ),
    );

    renderTrailApp(todoData, onUpdateTaskStatus);
    openProjectPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark Build the Trail parser as doing",
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Task update failed: The task changed after it was read.",
    );
  });
});
