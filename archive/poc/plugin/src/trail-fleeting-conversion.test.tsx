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

import {
  TrailCrossFileMutationError,
} from "./domain/trail-cross-file-mutation";
import type {
  TrailFleetingNote,
  TrailProject,
} from "./domain/trail-model";
import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
import {
  TrailApp,
  type TrailAppProps,
} from "./trail-app";

const note: TrailFleetingNote = {
  id: "6bce718b-03df-4a9a-865d-b374139a962e",
  text: "Convert this Fleeting Note",
  created: "2026-08-05T22:00:00+08:00",
  cleanupDue: "2026-08-12",
  source: {
    filePath: "Trail/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 128,
    fingerprint:
      "- Convert this Fleeting Note <!-- trail:fleeting -->\n",
  },
};

const firstProject: TrailProject = {
  id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  areaId: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  areaName: "Work",
  name: "Trail POC",
  created: "2026-08-04",
  status: "active",
  overview: "Validate Trail.",
  tasks: [],
  notes: [],
  filePath: "Trail/Areas/Work/Trail POC.md",
};

const secondProject: TrailProject = {
  id: "52834bec-5bf8-4147-9dfa-8c4a75ee81df",
  areaId: "6e8cfe67-e899-4af0-aa3d-1d97c6b88a6d",
  areaName: "Life",
  name: "Home Project",
  created: "2026-08-05",
  status: "planned",
  overview: "Second target Project.",
  tasks: [],
  notes: [],
  filePath: "Trail/Areas/Life/Home Project.md",
};

const data: TrailVaultReadResult = {
  areas: [],
  projects: [firstProject, secondProject],
  fleetingNotes: [note],
  issues: [],
};

function renderTrailApp(
  appData: TrailVaultReadResult,
  onConvertFleetingNoteToTask:
    TrailAppProps["onConvertFleetingNoteToTask"],
): void {
  render(
    <TrailApp
      data={appData}
      onUpdateTaskStatus={() => Promise.resolve()}
      onConvertFleetingNoteToTask={
        onConvertFleetingNoteToTask
      }
    />,
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Fleeting Notes",
    }),
  );
}

describe("Fleeting Note conversion UI", () => {
  it("converts a Note to the selected Project", async () => {
    const onConvertFleetingNoteToTask = vi.fn(
      () => Promise.resolve(),
    );

    renderTrailApp(data, onConvertFleetingNoteToTask);

    fireEvent.change(
      screen.getByRole("combobox", {
        name: `Target Project for ${note.text}`,
      }),
      {
        target: {
          value: secondProject.id,
        },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Convert ${note.text} to Task`,
      }),
    );

    await waitFor(() => {
      expect(
        onConvertFleetingNoteToTask,
      ).toHaveBeenCalledOnce();
    });
    expect(
      onConvertFleetingNoteToTask,
    ).toHaveBeenCalledWith(note, secondProject);
  });

  it(
    "disables the current Note controls while conversion is pending",
    async () => {
      let resolveConversion: (() => void) | undefined;
      const conversion = new Promise<void>((resolve) => {
        resolveConversion = resolve;
      });
      const onConvertFleetingNoteToTask = vi.fn(
        () => conversion,
      );

      renderTrailApp(data, onConvertFleetingNoteToTask);

      const projectSelect = screen.getByRole("combobox", {
        name: `Target Project for ${note.text}`,
      });
      const convertButton = screen.getByRole("button", {
        name: `Convert ${note.text} to Task`,
      });

      fireEvent.click(convertButton);

      expect(projectSelect).toBeDisabled();
      expect(convertButton).toBeDisabled();
      expect(convertButton).toHaveTextContent("Converting...");

      if (!resolveConversion) {
        throw new Error("The conversion did not start.");
      }

      resolveConversion();

      await waitFor(() => {
        expect(convertButton).toBeEnabled();
      });
    },
  );

  it("exposes a partial result and blocks direct retry", async () => {
    const error = new TrailCrossFileMutationError(
      "compensation-failed",
      "partial",
      "Trail could not remove the source object, "
        + "and compensating the target object also failed.",
    );
    const onConvertFleetingNoteToTask = vi.fn(
      () => Promise.reject(error),
    );

    renderTrailApp(data, onConvertFleetingNoteToTask);

    const convertButton = screen.getByRole("button", {
      name: `Convert ${note.text} to Task`,
    });

    fireEvent.click(convertButton);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Conversion result: partial.");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Manual review is required before retrying.",
    );
    expect(convertButton).toBeDisabled();
    expect(convertButton).toHaveTextContent(
      "Review required",
    );
  });

  it("disables conversion when no target Project exists", () => {
    renderTrailApp(
      {
        ...data,
        projects: [],
      },
      () => Promise.resolve(),
    );

    expect(
      screen.getByText("No target Projects available."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Convert ${note.text} to Task`,
      }),
    ).toBeDisabled();
  });
});
