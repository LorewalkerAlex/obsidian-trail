import type { TrailFleetingNote } from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";

export type TrailFleetingNoteUpdateErrorCode =
  | "source-fingerprint-missing"
  | "fleeting-file-invalid"
  | "fleeting-note-duplicate"
  | "fleeting-note-not-found"
  | "fleeting-note-conflict"
  | "fleeting-text-invalid";

export class TrailFleetingNoteUpdateError extends Error {
  constructor(
    readonly code: TrailFleetingNoteUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailFleetingNoteUpdateError";
  }
}

export interface TrailFleetingNoteUpdateInput {
  markdown: string;
  expectedNote: TrailFleetingNote;
  text: string;
}

export function updateFleetingNoteMarkdown({
  markdown,
  expectedNote,
  text,
}: TrailFleetingNoteUpdateInput): string {
  const nextText = normalizeFleetingNoteText(text);
  const expectedFingerprint = expectedNote.source.fingerprint;

  if (expectedFingerprint === undefined) {
    throw new TrailFleetingNoteUpdateError(
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
    throw new TrailFleetingNoteUpdateError(
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
    throw new TrailFleetingNoteUpdateError(
      "fleeting-note-duplicate",
      duplicateIssue.message,
    );
  }

  const latestNote = result.notes.find(
    (note) => note.id === expectedNote.id,
  );

  if (!latestNote) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-note-not-found",
      `Fleeting Note UUID "${expectedNote.id}" was not found.`,
    );
  }

  if (latestNote.source.fingerprint !== expectedFingerprint) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-note-conflict",
      "The Fleeting Note changed after it was read.",
    );
  }

  if (latestNote.text === nextText) {
    return markdown;
  }

  const commentOffset = expectedFingerprint.indexOf("<!--");

  if (commentOffset < 0) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-note-conflict",
      "The Fleeting Note metadata comment could not be located.",
    );
  }

  const replacement = `- ${nextText} ${expectedFingerprint.slice(commentOffset)}`;
  const updatedMarkdown = [
    markdown.slice(0, latestNote.source.startOffset),
    replacement,
    markdown.slice(latestNote.source.endOffset),
  ].join("");
  const updatedResult = parseFleetingNotes({
    filePath: expectedNote.source.filePath,
    markdown: updatedMarkdown,
  });
  const updatedNote = updatedResult.notes.find(
    (note) => note.id === expectedNote.id,
  );
  const relevantIssue = updatedResult.issues.find(
    (issue) =>
      issue.scope === "file"
      || issue.objectId === expectedNote.id,
  );

  if (
    relevantIssue
    || !updatedNote
    || updatedNote.text !== nextText
    || updatedNote.created !== expectedNote.created
    || updatedNote.cleanupDue !== expectedNote.cleanupDue
  ) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-text-invalid",
      relevantIssue?.message
        ?? "The updated Fleeting Note could not be parsed.",
    );
  }

  return updatedMarkdown;
}

export function normalizeFleetingNoteText(text: string): string {
  const normalized = text.trim();

  if (
    normalized === ""
    || /[\r\n]/.test(normalized)
    || /<!--\s*trail:fleeting\b/i.test(normalized)
  ) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-text-invalid",
      "Fleeting Note text must be one non-empty line without a trail:fleeting metadata marker.",
    );
  }

  return normalized;
}
