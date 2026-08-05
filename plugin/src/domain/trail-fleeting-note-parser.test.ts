import { describe, expect, it } from "vitest";

import {
  parseFleetingNotes,
} from "./trail-fleeting-note-parser";

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
const markdown = [
  firstLine,
  secondLine,
  "",
].join("\n");

describe("Trail Fleeting Note parser", () => {
  it("parses top-level Fleeting Notes with source ranges", () => {
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown,
    });

    expect(result.issues).toEqual([]);
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0]).toMatchObject({
      id: FIRST_ID,
      text: "Research MetadataCache",
      created: CREATED_AT,
      cleanupDue: "2026-08-10",
      source: {
        filePath: FILE_PATH,
        startOffset: 0,
        endOffset: firstLine.length + 1,
        fingerprint: `${firstLine}\n`,
      },
    });
    expect(result.notes[1]).toMatchObject({
      id: SECOND_ID,
      text: "Consider a date view",
      created: SECOND_CREATED_AT,
      source: {
        filePath: FILE_PATH,
        startOffset: firstLine.length + 1,
        endOffset: markdown.length,
        fingerprint: `${secondLine}\n`,
      },
    });
  });

  it("preserves exact CRLF source ranges", () => {
    const crlfMarkdown = markdown.replaceAll("\n", "\r\n");
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown: crlfMarkdown,
    });

    expect(result.issues).toEqual([]);
    expect(result.notes[0]?.source.fingerprint).toBe(
      `${firstLine}\r\n`,
    );
    expect(result.notes[1]?.source.fingerprint).toBe(
      `${secondLine}\r\n`,
    );
  });

  it("isolates malformed metadata and retains valid siblings", () => {
    const invalidLine =
      `- Invalid <!-- trail:fleeting {"id":"${FIRST_ID}","created":"not-a-time"} -->`;
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown: [
        invalidLine,
        secondLine,
        "",
      ].join("\n"),
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.id).toBe(SECOND_ID);
    expect(result.issues).toEqual([
      expect.objectContaining({
        scope: "fleeting",
        code: "fleeting.metadata.invalid",
        line: 1,
        objectId: FIRST_ID,
      }),
    ]);
  });

  it("reports duplicate Fleeting Note UUIDs", () => {
    const duplicateLine =
      `- Duplicate <!-- trail:fleeting {"id":"${FIRST_ID}","created":"${SECOND_CREATED_AT}"} -->`;
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown: [
        firstLine,
        duplicateLine,
        "",
      ].join("\n"),
    });

    expect(result.notes).toHaveLength(1);
    expect(result.issues).toEqual([
      expect.objectContaining({
        scope: "fleeting",
        code: "fleeting.id.duplicate",
        line: 2,
        objectId: FIRST_ID,
      }),
    ]);
  });

  it("reports invalid list item syntax without hiding valid notes", () => {
    const invalidLine =
      "- Missing metadata";
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown: [
        invalidLine,
        secondLine,
        "",
      ].join("\n"),
    });

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]?.id).toBe(SECOND_ID);
    expect(result.issues).toEqual([
      expect.objectContaining({
        scope: "fleeting",
        code: "fleeting.syntax.invalid",
        line: 1,
      }),
    ]);
  });

  it("rejects non-list file content as a file issue", () => {
    const result = parseFleetingNotes({
      filePath: FILE_PATH,
      markdown: [
        "# Fleeting Notes",
        firstLine,
        "",
      ].join("\n"),
    });

    expect(result.notes).toHaveLength(1);
    expect(result.issues).toEqual([
      expect.objectContaining({
        scope: "file",
        code: "fleeting.file.content.invalid",
        line: 1,
      }),
    ]);
  });
});
