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
  fleetingNotes: [],
  issues: [],
};

const fleetingData: TrailVaultReadResult = {
  ...data,
  fleetingNotes: [
    {
      id: "6bce718b-03df-4a9a-865d-b374139a962e",
      text: "Wire Fleeting Notes into Trail",
      created: "2026-08-05T20:00:00+08:00",
      cleanupDue: "2026-08-12",
      source: {
        filePath: "Trail/Fleeting Notes.md",
        startOffset: 0,
        endOffset: 120,
      },
    },
  ],
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

const secondProject: TrailProject = {
  id: "52d0ba61-09a6-4b9d-b97a-c15d09c12683",
  areaId: data.areas[0].id,
  areaName: data.areas[0].name,
  name: "Project Navigation",
  created: "2026-08-06",
  status: "planned",
  overview: "Open a specific Project from Areas.",
  tasks: [],
  notes: [],
  filePath: "Trail/Areas/Work/Project Navigation.md",
};

const navigationData: TrailVaultReadResult = {
  ...data,
  projects: [data.projects[0], secondProject],
};

function renderTrailApp(
  appData: TrailVaultReadResult = data,
  onUpdateTaskStatus: TrailAppProps["onUpdateTaskStatus"] =
    () => Promise.resolve(),
  onConvertFleetingNoteToTask:
    TrailAppProps["onConvertFleetingNoteToTask"] =
      () => Promise.resolve(),
): void {
  render(
    <TrailApp
      data={appData}
      onUpdateTaskStatus={onUpdateTaskStatus}
      onConvertFleetingNoteToTask={
        onConvertFleetingNoteToTask
      }
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

function openAreasPage(): void {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Areas",
    }),
  );
}

function openFleetingNotesPage(): void {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Fleeting Notes",
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
        "1 Area · 1 Project · 1 Task · 0 Fleeting Notes",
      ),
    ).toBeInTheDocument();
  });

  it("shows Areas and their Projects", () => {
    renderTrailApp();
    openAreasPage();

    expect(
      screen.getByRole("heading", {
        name: "Areas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open Trail POC",
      }),
    ).toBeInTheDocument();
  });

  it("opens and retains a selected Project from Areas", () => {
    renderTrailApp(navigationData);
    openAreasPage();

    fireEvent.click(
      screen.getByRole("button", {
        name: `Open ${secondProject.name}`,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: secondProject.name,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(secondProject.overview))
      .toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    );
    openProjectPage();

    expect(
      screen.getByRole("heading", {
        name: secondProject.name,
      }),
    ).toBeInTheDocument();
  });

  it("shows parsed Fleeting Notes", () => {
    renderTrailApp(fleetingData);
    openFleetingNotesPage();

    expect(
      screen.getByRole("heading", {
        name: "Fleeting Notes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Wire Fleeting Notes into Trail"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Created: 2026-08-05T20:00:00+08:00",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cleanup due: 2026-08-12"),
    ).toBeInTheDocument();
  });

  it("shows an empty Fleeting Notes state", () => {
    renderTrailApp();
    openFleetingNotesPage();

    expect(
      screen.getByText("No Fleeting Notes found."),
    ).toBeInTheDocument();
  });

  it("shows the first parsed Project workspace", () => {
    renderTrailApp();
    openProjectPage();

    expect(
      screen.getByRole("heading", {
        name: "Trail POC",
      }),
    ).toBeInTheDocument();

    const taskCard = within(
      screen.getByRole("region", {
        name: "Doing Tasks",
      }),
    ).getByRole("article", {
      name: "Build the Trail parser Task",
    });

    expect(taskCard).toHaveTextContent(
      "Build the Trail parser",
    );
    expect(taskCard).toHaveTextContent("Priority: high");
    expect(taskCard).toHaveTextContent("Due: None");
    expect(taskCard).toHaveTextContent("Subtasks: 1/2");
    expect(taskCard).toHaveTextContent("type:spike");
    expect(
      screen.getByText("The POC is read-only."),
    ).toBeInTheDocument();
  });

  it("shows an empty Project state", () => {
    renderTrailApp({
      ...data,
      projects: [],
    });
    openProjectPage();

    expect(
      screen.getByText("No Trail projects found."),
    ).toBeInTheDocument();
  });

  it("requests a todo to doing Task status update", async () => {
    const onUpdateTaskStatus = vi.fn(
      () => Promise.resolve(),
    );

    renderTrailApp(todoData, onUpdateTaskStatus);
    openProjectPage();

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Status for Build the Trail parser",
      }),
      { target: { value: "doing" } },
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

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Status for Build the Trail parser",
      }),
      { target: { value: "todo" } },
    );

    await waitFor(() => {
      expect(onUpdateTaskStatus).toHaveBeenCalledOnce();
    });
    expect(onUpdateTaskStatus).toHaveBeenCalledWith(
      doingTask,
      "todo",
    );
  });

  it(
    "keeps another Task action available while one is pending",
    async () => {
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

      const firstSelect = screen.getByRole("combobox", {
        name: "Status for Build the Trail parser",
      });

      fireEvent.change(firstSelect, {
        target: { value: "doing" },
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", {
          name: "Status for Build the Trail parser",
        })).toBeDisabled();
      });
      expect(screen.getByRole("combobox", {
        name: "Status for Test the mutation queue",
      })).toBeEnabled();

      fireEvent.change(screen.getByRole("combobox", {
        name: "Status for Test the mutation queue",
      }), {
        target: { value: "doing" },
      });

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
        expect(screen.getByRole("combobox", {
          name: "Status for Build the Trail parser",
        })).toBeEnabled();
      });
    },
  );

  it("shows a Task update failure", async () => {
    const onUpdateTaskStatus = vi.fn(
      () => Promise.reject(
        new Error("The task changed after it was read."),
      ),
    );

    renderTrailApp(todoData, onUpdateTaskStatus);
    openProjectPage();

    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Status for Build the Trail parser",
      }),
      { target: { value: "doing" } },
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Task update failed: The task changed after it was read.",
    );
  });
});
