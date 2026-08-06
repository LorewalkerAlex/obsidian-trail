import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeFleetingNoteText,
  TrailFleetingNoteUpdateError,
  updateFleetingNoteMarkdown,
} from "./trail-fleeting-note-editor";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import {
  TRAIL_FLEETING_NOTES_PATH,
} from "./trail-fleeting-note-lifecycle";

const NOTE_ID = "6bce718b-03df-4a9a-865d-b374139a962e";
const CREATED_AT = "2026-08-06T14:50:00+08:00";
const line =
  `- Original note <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}","cleanup_due":"2026-08-10"} -->`;

function requireNote(markdown: string) {
  const result = parseFleetingNotes({
    filePath: TRAIL_FLEETING_NOTES_PATH,
    markdown,
  });
  const note = result.notes[0];

  if (!note) {
    throw new Error("Expected one Fleeting Note.");
  }

  return note;
}

describe("Trail Fleeting Note editor", () => {
  it("updates only the visible text and preserves metadata", () => {
    const markdown = `${line}\r\n`;
    const note = requireNote(markdown);

    const updated = updateFleetingNoteMarkdown({
      markdown,
      expectedNote: note,
      text: "  Updated note  ",
    });

    expect(updated).toBe(
      `- Updated note <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}","cleanup_due":"2026-08-10"} -->\r\n`,
    );
    expect(requireNote(updated)).toMatchObject({
      id: NOTE_ID,
      text: "Updated note",
      created: CREATED_AT,
      cleanupDue: "2026-08-10",
    });
  });

  it("returns the original Markdown when the normalized text is unchanged", () => {
    const markdown = `${line}\n`;
    const note = requireNote(markdown);

    expect(updateFleetingNoteMarkdown({
      markdown,
      expectedNote: note,
      text: " Original note ",
    })).toBe(markdown);
  });

  it("rejects empty, multiline, and metadata-marker text", () => {
    expect(() => normalizeFleetingNoteText("   ")).toThrow(
      TrailFleetingNoteUpdateError,
    );
    expect(() => normalizeFleetingNoteText("one\ntwo")).toThrow(
      TrailFleetingNoteUpdateError,
    );
    expect(() => normalizeFleetingNoteText(
      "text <!-- trail:fleeting {} -->",
    )).toThrow(TrailFleetingNoteUpdateError);
  });

  it("rejects a missing source fingerprint", () => {
    const markdown = `${line}\n`;
    const note = requireNote(markdown);

    const error = captureError(() => updateFleetingNoteMarkdown({
      markdown,
      expectedNote: {
        ...note,
        source: {
          filePath: note.source.filePath,
          startOffset: note.source.startOffset,
          endOffset: note.source.endOffset,
        },
      },
      text: "Updated note",
    }));

    expect(error).toMatchObject({
      code: "source-fingerprint-missing",
    });
  });

  it("rejects an externally changed Fleeting Note", () => {
    const markdown = `${line}\n`;
    const note = requireNote(markdown);
    const changed = markdown.replace(
      "Original note",
      "External change",
    );

    const error = captureError(() => updateFleetingNoteMarkdown({
      markdown: changed,
      expectedNote: note,
      text: "Updated note",
    }));

    expect(error).toMatchObject({
      code: "fleeting-note-conflict",
    });
  });

  it("rejects a duplicate UUID", () => {
    const markdown = `${line}\n${line.replace("Original", "Duplicate")}\n`;
    const note = requireNote(`${line}\n`);

    const error = captureError(() => updateFleetingNoteMarkdown({
      markdown,
      expectedNote: note,
      text: "Updated note",
    }));

    expect(error).toMatchObject({
      code: "fleeting-note-duplicate",
    });
  });
});

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected the action to fail.");
}
