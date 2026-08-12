import type { TrailFleetingNote } from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";

export type TrailFleetingNoteRemovalErrorCode =
  | "source-fingerprint-missing"
  | "fleeting-file-invalid"
  | "fleeting-note-duplicate"
  | "fleeting-note-conflict";

export class TrailFleetingNoteRemovalError extends Error {
  constructor(
    readonly code: TrailFleetingNoteRemovalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailFleetingNoteRemovalError";
  }
}

export interface TrailFleetingNoteRemovalInput {
  markdown: string;
  expectedNote: TrailFleetingNote;
}

export function removeFleetingNoteMarkdown({
  markdown,
  expectedNote,
}: TrailFleetingNoteRemovalInput): string {
  const expectedFingerprint =
    expectedNote.source.fingerprint;

  if (expectedFingerprint === undefined) {
    throw new TrailFleetingNoteRemovalError(
      "source-fingerprint-missing",
      "The Fleeting Note does not contain a source fingerprint.",
    );
  }

  const result = parseFleetingNotes({
    filePath: expectedNote.source.filePath,
    markdown,
  });
  const fileIssue = result.issues.find(
    (issue) => issue.scope === "file",
  );

  if (fileIssue) {
    throw new TrailFleetingNoteRemovalError(
      "fleeting-file-invalid",
      fileIssue.message,
    );
  }

  const duplicateIssue = result.issues.find(
    (issue) =>
      issue.code === "fleeting.id.duplicate"
      && issue.objectId === expectedNote.id,
  );

  if (duplicateIssue) {
    throw new TrailFleetingNoteRemovalError(
      "fleeting-note-duplicate",
      duplicateIssue.message,
    );
  }

  const latestNote = result.notes.find(
    (note) => note.id === expectedNote.id,
  );

  if (!latestNote) {
    return markdown;
  }

  if (
    latestNote.source.fingerprint
    !== expectedFingerprint
  ) {
    throw new TrailFleetingNoteRemovalError(
      "fleeting-note-conflict",
      "The Fleeting Note changed after it was read.",
    );
  }

  return [
    markdown.slice(0, latestNote.source.startOffset),
    markdown.slice(latestNote.source.endOffset),
  ].join("");
}
