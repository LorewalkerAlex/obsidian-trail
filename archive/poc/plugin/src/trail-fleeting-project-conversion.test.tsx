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
  TrailArea,
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
  text: "Plan **Trail** / launch",
  created: "2026-08-06T12:30:00+08:00",
  source: {
    filePath: "Trail/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 120,
    fingerprint: "fleeting-project",
  },
};
const firstArea: TrailArea = {
  id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  name: "Work",
  created: "2026-08-04",
  description: "Work Area",
  filePath: "Trail/Areas/Work/Area.md",
};
const secondArea: TrailArea = {
  id: "6e8cfe67-e899-4af0-aa3d-1d97c6b88a6d",
  name: "Life",
  created: "2026-08-05",
  description: "Life Area",
  filePath: "Trail/Areas/Life/Area.md",
};
const project: TrailProject = {
  id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  areaId: firstArea.id,
  areaName: firstArea.name,
  name: "Trail POC",
  created: "2026-08-04",
  status: "active",
  overview: "Validate Trail.",
  tasks: [],
  notes: [],
  filePath: "Trail/Areas/Work/Trail POC.md",
};
const data: TrailVaultReadResult = {
  areas: [firstArea, secondArea],
  projects: [project],
  fleetingNotes: [note],
  archivedFleetingNotes: [],
  trashedFleetingNotes: [],
  issues: [],
};

interface RenderOptions {
  data?: TrailVaultReadResult;
  onConvertFleetingNoteToProject?:
    TrailAppProps["onConvertFleetingNoteToProject"];
}

function renderProjectConversion(
  options: RenderOptions = {},
): void {
  render(
    <TrailApp
      data={options.data ?? data}
      onUpdateTaskStatus={() => Promise.resolve()}
      onConvertFleetingNoteToProject={
        options.onConvertFleetingNoteToProject
        ?? (() => Promise.resolve())
      }
      onConvertFleetingNoteToTask={() => Promise.resolve()}
      onArchiveFleetingNote={() => Promise.resolve()}
      onDeleteFleetingNote={() => Promise.resolve()}
      onRestoreFleetingNote={() => Promise.resolve()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Fleeting Notes",
    }),
  );
}

describe("Fleeting Note to Project UI", () => {
  it("suggests a name and converts to the selected Area", async () => {
    const onConvertFleetingNoteToProject = vi.fn(
      () => Promise.resolve(),
    );

    renderProjectConversion({
      onConvertFleetingNoteToProject,
    });
    const nameInput = screen.getByRole("textbox", {
      name: `Project name for ${note.text}`,
    });
    const areaSelect = screen.getByRole("combobox", {
      name: `Target Area for ${note.text}`,
    });

    expect(nameInput).toHaveValue("Plan Trail launch");
    fireEvent.change(nameInput, {
      target: { value: "Trail Launch Project" },
    });
    fireEvent.change(areaSelect, {
      target: { value: secondArea.id },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: `Convert ${note.text} to Project`,
      }),
    );

    await waitFor(() => {
      expect(
        onConvertFleetingNoteToProject,
      ).toHaveBeenCalledOnce();
    });
    expect(
      onConvertFleetingNoteToProject,
    ).toHaveBeenCalledWith(
      note,
      secondArea,
      "Trail Launch Project",
    );
  });

  it("disables the Note controls while conversion is pending", async () => {
    let resolveConversion: (() => void) | undefined;
    const conversion = new Promise<void>((resolve) => {
      resolveConversion = resolve;
    });
    const onConvertFleetingNoteToProject = vi.fn(
      () => conversion,
    );

    renderProjectConversion({
      onConvertFleetingNoteToProject,
    });
    const convertProjectButton = screen.getByRole(
      "button",
      { name: `Convert ${note.text} to Project` },
    );
    const convertTaskButton = screen.getByRole(
      "button",
      { name: `Convert ${note.text} to Task` },
    );
    const nameInput = screen.getByRole("textbox", {
      name: `Project name for ${note.text}`,
    });

    fireEvent.click(convertProjectButton);

    expect(convertProjectButton).toBeDisabled();
    expect(convertProjectButton).toHaveTextContent(
      "Converting to Project...",
    );
    expect(convertTaskButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(screen.getByRole("button", {
      name: `Archive ${note.text}`,
    })).toBeDisabled();

    if (!resolveConversion) {
      throw new Error("Project conversion did not start.");
    }
    resolveConversion();

    await waitFor(() => {
      expect(convertProjectButton).toBeEnabled();
    });
  });

  it("exposes partial and blocks every Note action", async () => {
    const error = new TrailCrossFileMutationError(
      "compensation-failed",
      "partial",
      "Trail could not remove the source object, and compensation failed.",
    );
    const onConvertFleetingNoteToProject = vi.fn(
      () => Promise.reject(error),
    );

    renderProjectConversion({
      onConvertFleetingNoteToProject,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: `Convert ${note.text} to Project`,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Project conversion result: partial.",
    );
    const buttons = [
      screen.getByRole("button", {
        name: `Convert ${note.text} to Project`,
      }),
      screen.getByRole("button", {
        name: `Convert ${note.text} to Task`,
      }),
      screen.getByRole("button", {
        name: `Archive ${note.text}`,
      }),
      screen.getByRole("button", {
        name: `Delete ${note.text}`,
      }),
    ];
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent("Review required");
    });
  });

  it("shows the Project path conflict and keeps retry available", async () => {
    const error = new TrailCrossFileMutationError(
      "target-create-failed",
      "unchanged",
      "Trail could not create the target object.",
      new Error(
        "A different file or folder already exists at the Project path.",
      ),
    );
    const onConvertFleetingNoteToProject = vi.fn(
      () => Promise.reject(error),
    );

    renderProjectConversion({
      onConvertFleetingNoteToProject,
    });
    const convertButton = screen.getByRole("button", {
      name: `Convert ${note.text} to Project`,
    });
    fireEvent.click(convertButton);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "A different file or folder already exists at the Project path.",
    );
    expect(convertButton).toBeEnabled();
  });

  it("disables Project conversion when no Area exists", () => {
    renderProjectConversion({
      data: {
        ...data,
        areas: [],
      },
    });

    expect(
      screen.getByText("No target Areas available."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: `Convert ${note.text} to Project`,
    })).toBeDisabled();
  });
});
