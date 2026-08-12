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

import {
  TrailCrossFileMutationError,
} from "./domain/trail-cross-file-mutation";
import type {
  TrailFleetingNote,
  TrailStoredFleetingNote,
} from "./domain/trail-model";
import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
import {
  TrailApp,
  type TrailAppProps,
} from "./trail-app";

const activeNote: TrailFleetingNote = {
  id: "6bce718b-03df-4a9a-865d-b374139a962e",
  text: "Active lifecycle note",
  created: "2026-08-06T10:30:00+08:00",
  source: {
    filePath: "Trail/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 100,
    fingerprint: "active",
  },
};
const archivedNote: TrailStoredFleetingNote = {
  id: "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45",
  text: "Archived lifecycle note",
  created: "2026-08-05T10:30:00+08:00",
  storage: "archive",
  storedAt: "2026-08-06T10:35:00+08:00",
  source: {
    filePath: "Trail/Archive/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 100,
    fingerprint: "archive",
  },
};
const trashedNote: TrailStoredFleetingNote = {
  id: "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb",
  text: "Deleted lifecycle note",
  created: "2026-08-04T10:30:00+08:00",
  storage: "trash",
  storedAt: "2026-08-06T10:36:00+08:00",
  source: {
    filePath: "Trail/Trash/Fleeting Notes.md",
    startOffset: 0,
    endOffset: 100,
    fingerprint: "trash",
  },
};
const data: TrailVaultReadResult = {
  areas: [],
  projects: [],
  fleetingNotes: [activeNote],
  archivedFleetingNotes: [archivedNote],
  trashedFleetingNotes: [trashedNote],
  issues: [],
};

interface RenderOptions {
  data?: TrailVaultReadResult;
  onArchiveFleetingNote?:
    TrailAppProps["onArchiveFleetingNote"];
  onDeleteFleetingNote?:
    TrailAppProps["onDeleteFleetingNote"];
  onRestoreFleetingNote?:
    TrailAppProps["onRestoreFleetingNote"];
}

function renderLifecycle(
  options: RenderOptions = {},
): void {
  render(
    <TrailApp
      data={options.data ?? data}
      onUpdateTaskStatus={() => Promise.resolve()}
      onConvertFleetingNoteToTask={() => Promise.resolve()}
      onArchiveFleetingNote={
        options.onArchiveFleetingNote
        ?? (() => Promise.resolve())
      }
      onDeleteFleetingNote={
        options.onDeleteFleetingNote
        ?? (() => Promise.resolve())
      }
      onRestoreFleetingNote={
        options.onRestoreFleetingNote
        ?? (() => Promise.resolve())
      }
    />,
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Fleeting Notes",
    }),
  );
}

describe("Fleeting Note lifecycle UI", () => {
  it("orders lifecycle sections by created time", () => {
    const earlierActiveNote: TrailFleetingNote = {
      ...activeNote,
      id: "2a8ab6f2-8064-4192-8fc5-8a52297cedbb",
      text: "Earlier active lifecycle note",
      created: "2026-08-01T10:30:00+08:00",
      source: {
        ...activeNote.source,
        fingerprint: "earlier-active",
      },
    };
    const laterArchivedNote: TrailStoredFleetingNote = {
      ...archivedNote,
      id: "b08ddbd7-5502-418d-83b7-23ab38dcd0cb",
      text: "Later archived lifecycle note",
      created: "2026-08-07T10:30:00+08:00",
      source: {
        ...archivedNote.source,
        fingerprint: "later-archive",
      },
    };

    renderLifecycle({
      data: {
        ...data,
        fleetingNotes: [activeNote, earlierActiveNote],
        archivedFleetingNotes: [
          laterArchivedNote,
          archivedNote,
        ],
      },
    });

    const activeItems = within(
      screen.getByRole("list", {
        name: "Fleeting Notes",
      }),
    ).getAllByRole("listitem");
    expect(activeItems[0]).toHaveTextContent(
      earlierActiveNote.text,
    );
    expect(activeItems[1]).toHaveTextContent(activeNote.text);

    const archivedItems = within(
      screen.getByRole("region", {
        name: "Archived Fleeting Notes",
      }),
    ).getAllByRole("listitem");
    expect(archivedItems[0]).toHaveTextContent(
      archivedNote.text,
    );
    expect(archivedItems[1]).toHaveTextContent(
      laterArchivedNote.text,
    );
  });

  it("requests Archive and shows its pending state", async () => {
    let resolveArchive: (() => void) | undefined;
    const archive = new Promise<void>((resolve) => {
      resolveArchive = resolve;
    });
    const onArchiveFleetingNote = vi.fn(
      () => archive,
    );

    renderLifecycle({ onArchiveFleetingNote });
    const archiveButton = screen.getByRole("button", {
      name: `Archive ${activeNote.text}`,
    });
    const deleteButton = screen.getByRole("button", {
      name: `Delete ${activeNote.text}`,
    });

    fireEvent.click(archiveButton);

    expect(onArchiveFleetingNote).toHaveBeenCalledWith(
      activeNote,
    );
    expect(archiveButton).toBeDisabled();
    expect(archiveButton).toHaveTextContent("Archiving...");
    expect(deleteButton).toBeDisabled();

    if (!resolveArchive) {
      throw new Error("Archive did not start.");
    }
    resolveArchive();

    await waitFor(() => {
      expect(archiveButton).toBeEnabled();
    });
  });

  it("requests Delete to Trash", async () => {
    const onDeleteFleetingNote = vi.fn(
      () => Promise.resolve(),
    );

    renderLifecycle({ onDeleteFleetingNote });
    fireEvent.click(
      screen.getByRole("button", {
        name: `Delete ${activeNote.text}`,
      }),
    );

    await waitFor(() => {
      expect(onDeleteFleetingNote).toHaveBeenCalledOnce();
    });
    expect(onDeleteFleetingNote).toHaveBeenCalledWith(
      activeNote,
    );
  });

  it("restores archived and deleted Fleeting Notes", async () => {
    const onRestoreFleetingNote = vi.fn(
      () => Promise.resolve(),
    );

    renderLifecycle({ onRestoreFleetingNote });
    fireEvent.click(
      screen.getByRole("button", {
        name: `Restore archive ${archivedNote.text}`,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `Restore trash ${trashedNote.text}`,
      }),
    );

    await waitFor(() => {
      expect(onRestoreFleetingNote).toHaveBeenCalledTimes(2);
    });
    expect(onRestoreFleetingNote).toHaveBeenNthCalledWith(
      1,
      archivedNote,
    );
    expect(onRestoreFleetingNote).toHaveBeenNthCalledWith(
      2,
      trashedNote,
    );
  });

  it("exposes a partial Archive result and blocks the Note", async () => {
    const error = new TrailCrossFileMutationError(
      "compensation-failed",
      "partial",
      "Trail could not remove the source object, and compensation failed.",
    );
    const onArchiveFleetingNote = vi.fn(
      () => Promise.reject(error),
    );

    renderLifecycle({ onArchiveFleetingNote });
    const archiveButton = screen.getByRole("button", {
      name: `Archive ${activeNote.text}`,
    });
    const deleteButton = screen.getByRole("button", {
      name: `Delete ${activeNote.text}`,
    });

    fireEvent.click(archiveButton);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Archive result: partial.");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Manual review is required before retrying.",
    );
    expect(archiveButton).toBeDisabled();
    expect(archiveButton).toHaveTextContent(
      "Review required",
    );
    expect(deleteButton).toBeDisabled();
  });
});
