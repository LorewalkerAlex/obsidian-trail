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
  TrailArea,
  TrailFleetingNote,
  TrailProject,
} from "./domain/trail-model";
import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
import {
  TrailApp,
  type TrailAppProps,
} from "./trail-app";

const area: TrailArea = {
  id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  name: "Work",
  created: "2026-08-04",
  description: "Work Area",
  filePath: "Trail/Areas/Work/Area.md",
};
const project: TrailProject = {
  id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  areaId: area.id,
  areaName: area.name,
  name: "Trail POC",
  created: "2026-08-04",
  status: "active",
  overview: "Validate Trail.",
  tasks: [],
  notes: [],
  filePath: "Trail/Areas/Work/Trail POC.md",
};
const note: TrailFleetingNote = {
  id: "6bce718b-03df-4a9a-865d-b374139a962e",
  text: "Original capture",
  created: "2026-08-06T14:50:00+08:00",
  source: {
    filePath: "Trail/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 120,
    fingerprint: "fleeting-create-edit",
  },
};
const data: TrailVaultReadResult = {
  areas: [area],
  projects: [project],
  fleetingNotes: [note],
  archivedFleetingNotes: [],
  trashedFleetingNotes: [],
  issues: [],
};

interface RenderOptions {
  onCreateFleetingNote?:
    TrailAppProps["onCreateFleetingNote"];
  onEditFleetingNote?:
    TrailAppProps["onEditFleetingNote"];
}

function renderCreateEdit(
  options: RenderOptions = {},
): void {
  render(
    <TrailApp
      data={data}
      onCreateFleetingNote={
        options.onCreateFleetingNote
        ?? (() => Promise.resolve())
      }
      onEditFleetingNote={
        options.onEditFleetingNote
        ?? (() => Promise.resolve())
      }
      onUpdateTaskStatus={() => Promise.resolve()}
      onConvertFleetingNoteToProject={
        () => Promise.resolve()
      }
      onConvertFleetingNoteToTask={() => Promise.resolve()}
      onArchiveFleetingNote={() => Promise.resolve()}
      onDeleteFleetingNote={() => Promise.resolve()}
      onRestoreFleetingNote={() => Promise.resolve()}
    />,
  );
}

function openFleetingNotes(): void {
  fireEvent.click(screen.getByRole("button", {
    name: "Fleeting Notes",
  }));
}

describe("Fleeting Note Quick Capture and edit UI", () => {
  it("shows the active Fleeting Note count on the Dashboard", () => {
    renderCreateEdit();

    expect(screen.getByText(
      "1 Area · 1 Project · 0 Tasks · 1 Fleeting Note",
    )).toBeInTheDocument();
  });

  it("captures a trimmed Note from the Dashboard and clears the input", async () => {
    const onCreateFleetingNote = vi.fn(
      () => Promise.resolve(),
    );

    renderCreateEdit({ onCreateFleetingNote });
    const input = screen.getByRole("textbox", {
      name: "Quick Capture text",
    });

    fireEvent.change(input, {
      target: { value: "  New capture  " },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Capture",
    }));

    await waitFor(() => {
      expect(onCreateFleetingNote).toHaveBeenCalledWith(
        "New capture",
      );
    });
    expect(input).toHaveValue("");
  });

  it("shows the Quick Capture pending state", async () => {
    let resolveCapture: (() => void) | undefined;
    const capture = new Promise<void>((resolve) => {
      resolveCapture = resolve;
    });

    renderCreateEdit({
      onCreateFleetingNote: () => capture,
    });
    const input = screen.getByRole("textbox", {
      name: "Quick Capture text",
    });
    fireEvent.change(input, {
      target: { value: "Pending capture" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Capture",
    }));

    expect(input).toBeDisabled();
    expect(screen.getByRole("button", {
      name: "Capturing...",
    })).toBeDisabled();

    if (!resolveCapture) {
      throw new Error("Quick Capture did not start.");
    }
    resolveCapture();

    await waitFor(() => {
      expect(input).toBeEnabled();
    });
  });

  it("keeps the Quick Capture text when creation fails", async () => {
    renderCreateEdit({
      onCreateFleetingNote: () =>
        Promise.reject(new Error("Injected capture failure.")),
    });
    const input = screen.getByRole("textbox", {
      name: "Quick Capture text",
    });
    fireEvent.change(input, {
      target: { value: "Keep this draft" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Capture",
    }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Quick Capture failed: Injected capture failure.",
    );
    expect(input).toHaveValue("Keep this draft");
  });

  it("edits an active Note and closes the editor after success", async () => {
    const onEditFleetingNote = vi.fn(
      () => Promise.resolve(),
    );

    renderCreateEdit({ onEditFleetingNote });
    openFleetingNotes();
    fireEvent.click(screen.getByRole("button", {
      name: `Edit ${note.text}`,
    }));
    const input = screen.getByRole("textbox", {
      name: `Edit ${note.text}`,
    });
    fireEvent.change(input, {
      target: { value: "Updated capture" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: `Save edits for ${note.text}`,
    }));

    await waitFor(() => {
      expect(onEditFleetingNote).toHaveBeenCalledWith(
        note,
        "Updated capture",
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("textbox", {
        name: `Edit ${note.text}`,
      })).not.toBeInTheDocument();
    });
  });

  it("uses the edit-start snapshot after runtime data refreshes", async () => {
    const onEditFleetingNote = vi.fn(
      () => Promise.resolve(),
    );
    const appProps: TrailAppProps = {
      data,
      onCreateFleetingNote: () => Promise.resolve(),
      onEditFleetingNote,
      onUpdateTaskStatus: () => Promise.resolve(),
      onConvertFleetingNoteToProject: () => Promise.resolve(),
      onConvertFleetingNoteToTask: () => Promise.resolve(),
      onArchiveFleetingNote: () => Promise.resolve(),
      onDeleteFleetingNote: () => Promise.resolve(),
      onRestoreFleetingNote: () => Promise.resolve(),
    };
    const { rerender } = render(<TrailApp {...appProps} />);

    openFleetingNotes();
    fireEvent.click(screen.getByRole("button", {
      name: `Edit ${note.text}`,
    }));
    fireEvent.change(screen.getByRole("textbox", {
      name: `Edit ${note.text}`,
    }), {
      target: { value: "User draft" },
    });

    const refreshedNote: TrailFleetingNote = {
      ...note,
      text: "External capture",
      source: {
        ...note.source,
        fingerprint: "external-fingerprint",
      },
    };

    rerender(
      <TrailApp
        {...appProps}
        data={{
          ...data,
          fleetingNotes: [refreshedNote],
        }}
      />,
    );

    expect(screen.getByRole("textbox", {
      name: `Edit ${refreshedNote.text}`,
    })).toHaveValue("User draft");

    fireEvent.click(screen.getByRole("button", {
      name: `Save edits for ${refreshedNote.text}`,
    }));

    await waitFor(() => {
      expect(onEditFleetingNote).toHaveBeenCalledWith(
        note,
        "User draft",
      );
    });
  });

  it("disables all Note actions while an edit is pending", async () => {
    let resolveEdit: (() => void) | undefined;
    const edit = new Promise<void>((resolve) => {
      resolveEdit = resolve;
    });

    renderCreateEdit({
      onEditFleetingNote: () => edit,
    });
    openFleetingNotes();
    fireEvent.click(screen.getByRole("button", {
      name: `Edit ${note.text}`,
    }));
    fireEvent.click(screen.getByRole("button", {
      name: `Save edits for ${note.text}`,
    }));

    expect(screen.getByRole("button", {
      name: `Save edits for ${note.text}`,
    })).toHaveTextContent("Saving...");
    expect(screen.getByRole("button", {
      name: `Archive ${note.text}`,
    })).toBeDisabled();
    expect(screen.getByRole("button", {
      name: `Convert ${note.text} to Task`,
    })).toBeDisabled();

    if (!resolveEdit) {
      throw new Error("Fleeting Note edit did not start.");
    }
    resolveEdit();

    await waitFor(() => {
      expect(screen.queryByRole("textbox", {
        name: `Edit ${note.text}`,
      })).not.toBeInTheDocument();
    });
  });

  it("keeps the editor open and shows an edit failure", async () => {
    renderCreateEdit({
      onEditFleetingNote: () =>
        Promise.reject(new Error("The Fleeting Note changed.")),
    });
    openFleetingNotes();
    fireEvent.click(screen.getByRole("button", {
      name: `Edit ${note.text}`,
    }));
    const input = screen.getByRole("textbox", {
      name: `Edit ${note.text}`,
    });
    fireEvent.change(input, {
      target: { value: "Conflicting update" },
    });
    fireEvent.click(screen.getByRole("button", {
      name: `Save edits for ${note.text}`,
    }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Edit failed: The Fleeting Note changed.",
    );
    expect(input).toHaveValue("Conflicting update");
  });
});
