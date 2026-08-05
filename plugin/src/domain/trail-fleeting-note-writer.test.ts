import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseFleetingNotes,
} from "./trail-fleeting-note-parser";
import {
  removeFleetingNoteMarkdown,
} from "./trail-fleeting-note-writer";

const FILE_PATH = "Trail/Fleeting Notes.md";
const FIRST_ID =
  "6bce718b-03df-4a9a-865d-b374139a962e";
const SECOND_ID =
  "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45";
const CREATED_AT = "2026-08-03T12:43:00+08:00";
const SECOND_CREATED_AT = "2026-08-03T12:44:00+08:00";

const firstLine =
  `- Research MetadataCache <!-- trail:fleeting {"id":"${FIRST_ID}","created":"${CREATED_AT}","cleanup_due":"2026-08-10"} -->`;
const secondLine =
  `- Consider a date view <!-- trail:fleeting {"id":"${SECOND_ID}","created":"${SECOND_CREATED_AT}"} -->`;

describe("Trail Fleeting Note writer", () => {
  it("removes the exact expected Fleeting Note", () => {
    const markdown = [
      firstLine,
      secondLine,
      "",
    ].join("\n");
    const expectedNote = requiredNote(
      markdown,
      FIRST_ID,
    );

    expect(removeFleetingNoteMarkdown({
      markdown,
      expectedNote,
    })).toBe(`${secondLine}\n`);
  });

  it("treats an already absent Fleeting Note as removed", () => {
    const originalMarkdown = `${firstLine}\n`;
    const expectedNote = requiredNote(
      originalMarkdown,
      FIRST_ID,
    );
    const latestMarkdown = `${secondLine}\n`;

    expect(removeFleetingNoteMarkdown({
      markdown: latestMarkdown,
      expectedNote,
    })).toBe(latestMarkdown);
  });

  it("requires a source fingerprint", () => {
    const markdown = `${firstLine}\n`;
    const expectedNote = requiredNote(
      markdown,
      FIRST_ID,
    );

    delete expectedNote.source.fingerprint;

    expect(() => removeFleetingNoteMarkdown({
      markdown,
      expectedNote,
    })).toThrow(
      expect.objectContaining({
        code: "source-fingerprint-missing",
      }),
    );
  });

  it("rejects duplicate Fleeting Note UUIDs", () => {
    const originalMarkdown = `${firstLine}\n`;
    const expectedNote = requiredNote(
      originalMarkdown,
      FIRST_ID,
    );
    const duplicateLine =
      `- Duplicate <!-- trail:fleeting {"id":"${FIRST_ID}","created":"${SECOND_CREATED_AT}"} -->`;
    const latestMarkdown = [
      firstLine,
      duplicateLine,
      "",
    ].join("\n");

    expect(() => removeFleetingNoteMarkdown({
      markdown: latestMarkdown,
      expectedNote,
    })).toThrow(
      expect.objectContaining({
        code: "fleeting-note-duplicate",
      }),
    );
  });

  it("rejects invalid Fleeting Notes file content", () => {
    const originalMarkdown = `${firstLine}\n`;
    const expectedNote = requiredNote(
      originalMarkdown,
      FIRST_ID,
    );
    const latestMarkdown = [
      "# Fleeting Notes",
      firstLine,
      "",
    ].join("\n");

    expect(() => removeFleetingNoteMarkdown({
      markdown: latestMarkdown,
      expectedNote,
    })).toThrow(
      expect.objectContaining({
        code: "fleeting-file-invalid",
      }),
    );
  });

  it("rejects removal after the Fleeting Note changes", () => {
    const originalMarkdown = `${firstLine}\n`;
    const expectedNote = requiredNote(
      originalMarkdown,
      FIRST_ID,
    );
    const latestMarkdown =
      `- Research the MetadataCache API <!-- trail:fleeting {"id":"${FIRST_ID}","created":"${CREATED_AT}","cleanup_due":"2026-08-10"} -->\n`;

    expect(() => removeFleetingNoteMarkdown({
      markdown: latestMarkdown,
      expectedNote,
    })).toThrow(
      expect.objectContaining({
        code: "fleeting-note-conflict",
      }),
    );
  });

  it("preserves exact CRLF content around the removed note", () => {
    const markdown = [
      firstLine,
      secondLine,
      "",
    ].join("\r\n");
    const expectedNote = requiredNote(
      markdown,
      FIRST_ID,
    );

    expect(removeFleetingNoteMarkdown({
      markdown,
      expectedNote,
    })).toBe(`${secondLine}\r\n`);
  });
});

function requiredNote(
  markdown: string,
  noteId: string,
) {
  const result = parseFleetingNotes({
    filePath: FILE_PATH,
    markdown,
  });
  const note = result.notes.find(
    (candidate) => candidate.id === noteId,
  );

  if (!note) {
    throw new Error(
      `Expected Fleeting Note UUID "${noteId}".`,
    );
  }

  return note;
}
