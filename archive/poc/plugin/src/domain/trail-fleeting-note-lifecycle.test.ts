import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  TrailFleetingNote,
  TrailStoredFleetingNote,
} from "./trail-model";
import {
  createActiveFleetingNoteMarkdown,
  createStoredFleetingNoteMarkdown,
  parseStoredFleetingNotes,
  TRAIL_FLEETING_ARCHIVE_PATH,
  TRAIL_FLEETING_NOTES_PATH,
  TRAIL_FLEETING_TRASH_PATH,
} from "./trail-fleeting-note-lifecycle";

const NOTE_ID = "6bce718b-03df-4a9a-865d-b374139a962e";
const CREATED_AT = "2026-08-06T10:30:00+08:00";
const STORED_AT = "2026-08-06T10:35:00+08:00";
const note: TrailFleetingNote = {
  id: NOTE_ID,
  text: "Review the lifecycle POC",
  created: CREATED_AT,
  cleanupDue: "2026-08-13",
  source: {
    filePath: TRAIL_FLEETING_NOTES_PATH,
    startOffset: 0,
    endOffset: 0,
    fingerprint: "source",
  },
};

describe("Trail Fleeting Note lifecycle Markdown", () => {
  it("creates and parses an archived Fleeting Note", () => {
    const markdown = createStoredFleetingNoteMarkdown({
      markdown: "",
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      note,
      storage: "archive",
      storedAt: STORED_AT,
    });
    const result = parseStoredFleetingNotes({
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      markdown,
      storage: "archive",
    });

    expect(result.issues).toEqual([]);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toMatchObject({
      id: NOTE_ID,
      text: note.text,
      created: CREATED_AT,
      cleanupDue: "2026-08-13",
      storage: "archive",
      storedAt: STORED_AT,
    });
    expect(markdown).toContain(
      `"archived_at":"${STORED_AT}"`,
    );
  });

  it("creates a deleted Fleeting Note and preserves CRLF", () => {
    const markdown = createStoredFleetingNoteMarkdown({
      markdown: "\r\n",
      filePath: TRAIL_FLEETING_TRASH_PATH,
      note,
      storage: "trash",
      storedAt: STORED_AT,
    });

    expect(markdown).toContain("\r\n- Review");
    expect(markdown).toContain(
      `"deleted_at":"${STORED_AT}"`,
    );
    expect(parseStoredFleetingNotes({
      filePath: TRAIL_FLEETING_TRASH_PATH,
      markdown,
      storage: "trash",
    }).notes[0]?.storage).toBe("trash");
  });

  it("is idempotent for the same stored record", () => {
    const first = createStoredFleetingNoteMarkdown({
      markdown: "",
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      note,
      storage: "archive",
      storedAt: STORED_AT,
    });
    const storedNote = requireStoredNote(first);
    const second = createStoredFleetingNoteMarkdown({
      markdown: first,
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      note: storedNote,
      storage: "archive",
      storedAt: STORED_AT,
    });

    expect(second).toBe(first);
  });

  it("rejects a conflicting UUID in the target file", () => {
    const first = createStoredFleetingNoteMarkdown({
      markdown: "",
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      note,
      storage: "archive",
      storedAt: STORED_AT,
    });

    expect(() => createStoredFleetingNoteMarkdown({
      markdown: first,
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      note: {
        ...note,
        text: "Changed text",
      },
      storage: "archive",
      storedAt: STORED_AT,
    })).toThrow(
      expect.objectContaining({
        code: "fleeting-note-id-conflict",
      }),
    );
  });

  it("restores an active line without lifecycle metadata", () => {
    const storedMarkdown =
      createStoredFleetingNoteMarkdown({
        markdown: "",
        filePath: TRAIL_FLEETING_ARCHIVE_PATH,
        note,
        storage: "archive",
        storedAt: STORED_AT,
      });
    const storedNote = requireStoredNote(storedMarkdown);
    const activeMarkdown =
      createActiveFleetingNoteMarkdown({
        markdown: "",
        filePath: TRAIL_FLEETING_NOTES_PATH,
        note: storedNote,
      });

    expect(activeMarkdown).toContain(`"id":"${NOTE_ID}"`);
    expect(activeMarkdown).not.toContain("archived_at");
    expect(activeMarkdown).not.toContain("deleted_at");
  });

  it("reports lifecycle metadata from the wrong storage", () => {
    const archiveMarkdown =
      createStoredFleetingNoteMarkdown({
        markdown: "",
        filePath: TRAIL_FLEETING_ARCHIVE_PATH,
        note,
        storage: "archive",
        storedAt: STORED_AT,
      });
    const result = parseStoredFleetingNotes({
      filePath: TRAIL_FLEETING_TRASH_PATH,
      markdown: archiveMarkdown,
      storage: "trash",
    });

    expect(result.notes).toEqual([]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "fleeting.lifecycle.metadata.invalid",
        objectId: NOTE_ID,
      }),
    );
  });
});

function requireStoredNote(
  markdown: string,
): TrailStoredFleetingNote {
  const result = parseStoredFleetingNotes({
    filePath: TRAIL_FLEETING_ARCHIVE_PATH,
    markdown,
    storage: "archive",
  });
  const storedNote = result.notes[0];

  if (!storedNote) {
    throw new Error("Expected one archived Fleeting Note.");
  }

  return storedNote;
}
