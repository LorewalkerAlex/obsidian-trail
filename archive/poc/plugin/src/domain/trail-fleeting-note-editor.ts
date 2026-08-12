import {
  applyGuardedMarkdownEdit,
} from "./trail-guarded-markdown-edit";
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

  return applyGuardedMarkdownEdit({
    markdown,
    expectedFingerprint: expectedNote.source.fingerprint,
    missingFingerprintError: () => new TrailFleetingNoteUpdateError(
      "source-fingerprint-missing",
      "The Fleeting Note does not contain a source fingerprint.",
    ),
    locateLatest: (latestMarkdown) => locateFleetingNoteForUpdate(
      latestMarkdown,
      expectedNote,
    ),
    conflictError: () => new TrailFleetingNoteUpdateError(
      "fleeting-note-conflict",
      "The Fleeting Note changed after it was read.",
    ),
    buildEdit: (latestNote) => buildFleetingNoteTextEdit(
      latestNote,
      nextText,
    ),
    verify: (updatedMarkdown) => verifyFleetingNoteTextUpdate(
      updatedMarkdown,
      expectedNote,
      nextText,
    ),
  });
}

function locateFleetingNoteForUpdate(
  markdown: string,
  expectedNote: TrailFleetingNote,
): TrailFleetingNote {
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

  return latestNote;
}

function buildFleetingNoteTextEdit(
  latestNote: TrailFleetingNote,
  nextText: string,
): {
  startOffset: number;
  endOffset: number;
  replacement: string;
} | undefined {
  if (latestNote.text === nextText) {
    return undefined;
  }

  const fingerprint = latestNote.source.fingerprint;
  const commentOffset = fingerprint?.indexOf("<!--") ?? -1;

  if (commentOffset < 0 || fingerprint === undefined) {
    throw new TrailFleetingNoteUpdateError(
      "fleeting-note-conflict",
      "The Fleeting Note metadata comment could not be located.",
    );
  }
  const replacement =
    `- ${nextText} ${fingerprint.slice(commentOffset)}`;

  return {
    startOffset: latestNote.source.startOffset,
    endOffset: latestNote.source.endOffset,
    replacement,
  };
}

function verifyFleetingNoteTextUpdate(
  markdown: string,
  expectedNote: TrailFleetingNote,
  nextText: string,
): void {
  const updatedResult = parseFleetingNotes({
    filePath: expectedNote.source.filePath,
    markdown,
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
