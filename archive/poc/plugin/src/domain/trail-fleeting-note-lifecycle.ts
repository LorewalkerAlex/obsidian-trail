import type {
  TrailFleetingNote,
  TrailFleetingNoteStorage,
  TrailParseIssue,
  TrailStoredFleetingNote,
} from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import { normalizeFleetingNoteText } from "./trail-fleeting-note-editor";
import type { TrailMarkdownInput } from "./trail-parser";

export const TRAIL_FLEETING_NOTES_PATH =
  "Trail/Fleeting Notes.md";
export const TRAIL_FLEETING_ARCHIVE_PATH =
  "Trail/Archive/Fleeting Notes.md";
export const TRAIL_FLEETING_TRASH_PATH =
  "Trail/Trash/Fleeting Notes.md";

const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
const FLEETING_METADATA_PATTERN =
  /<!--\s*trail:fleeting\s+(.+?)\s*-->/;

export type TrailFleetingNoteLifecycleWriteErrorCode =
  | "fleeting-file-invalid"
  | "fleeting-note-id-conflict";

export class TrailFleetingNoteLifecycleWriteError
  extends Error {
  constructor(
    readonly code:
      TrailFleetingNoteLifecycleWriteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailFleetingNoteLifecycleWriteError";
  }
}

export interface TrailStoredFleetingNotesParseInput
  extends TrailMarkdownInput {
  storage: TrailFleetingNoteStorage;
}

export interface TrailStoredFleetingNotesParseResult {
  notes: TrailStoredFleetingNote[];
  issues: TrailParseIssue[];
}

export type TrailFleetingNoteContent = Pick<
  TrailFleetingNote,
  "id" | "text" | "created" | "cleanupDue"
>;

export function storedFleetingNotePath(
  storage: TrailFleetingNoteStorage,
): string {
  return storage === "archive"
    ? TRAIL_FLEETING_ARCHIVE_PATH
    : TRAIL_FLEETING_TRASH_PATH;
}

export function parseStoredFleetingNotes({
  filePath,
  markdown,
  storage,
}: TrailStoredFleetingNotesParseInput):
  TrailStoredFleetingNotesParseResult {
  const result = parseFleetingNotes({
    filePath,
    markdown,
  });
  const issues = [...result.issues];
  const notes: TrailStoredFleetingNote[] = [];

  for (const note of result.notes) {
    const metadata = lifecycleMetadata(
      note.source.fingerprint,
    );
    const storedAt = storage === "archive"
      ? metadata?.archivedAt
      : metadata?.deletedAt;
    const unexpectedAt = storage === "archive"
      ? metadata?.deletedAt
      : metadata?.archivedAt;

    if (
      storedAt === undefined
      || unexpectedAt !== undefined
      || !TIMESTAMP_PATTERN.test(storedAt)
    ) {
      issues.push({
        scope: "fleeting",
        code: "fleeting.lifecycle.metadata.invalid",
        message: storage === "archive"
          ? "Archived Fleeting Note metadata must contain one valid archived_at timestamp."
          : "Deleted Fleeting Note metadata must contain one valid deleted_at timestamp.",
        filePath,
        line: lineNumberAt(markdown, note.source.startOffset),
        objectId: note.id,
      });
      continue;
    }

    notes.push({
      ...note,
      storage,
      storedAt,
    });
  }

  return { notes, issues };
}

export interface TrailCreateStoredFleetingNoteInput {
  markdown: string;
  filePath: string;
  note: TrailFleetingNote;
  storage: TrailFleetingNoteStorage;
  storedAt: string;
}

export function createStoredFleetingNoteMarkdown({
  markdown,
  filePath,
  note,
  storage,
  storedAt,
}: TrailCreateStoredFleetingNoteInput): string {
  const result = parseStoredFleetingNotes({
    filePath,
    markdown,
    storage,
  });

  rejectInvalidFile(result.issues);

  const existingNote = result.notes.find(
    (candidate) => candidate.id === note.id,
  );

  if (existingNote) {
    if (
      sameFleetingNote(existingNote, note)
      && existingNote.storedAt === storedAt
    ) {
      return markdown;
    }

    throw new TrailFleetingNoteLifecycleWriteError(
      "fleeting-note-id-conflict",
      `Fleeting Note UUID "${note.id}" already exists in ${filePath}.`,
    );
  }

  return appendLine(
    markdown,
    serializeFleetingNote({
      note,
      storage,
      storedAt,
    }),
  );
}

export interface TrailCreateActiveFleetingNoteInput {
  markdown: string;
  filePath: string;
  note: TrailFleetingNoteContent;
}

export function createActiveFleetingNoteMarkdown({
  markdown,
  filePath,
  note,
}: TrailCreateActiveFleetingNoteInput): string {
  const result = parseFleetingNotes({
    filePath,
    markdown,
  });

  rejectInvalidFile(result.issues);

  const existingNote = result.notes.find(
    (candidate) => candidate.id === note.id,
  );

  if (existingNote) {
    if (sameFleetingNote(existingNote, note)) {
      return markdown;
    }

    throw new TrailFleetingNoteLifecycleWriteError(
      "fleeting-note-id-conflict",
      `Fleeting Note UUID "${note.id}" already exists in ${filePath}.`,
    );
  }

  return appendLine(
    markdown,
    serializeFleetingNote({ note }),
  );
}

interface TrailSerializeFleetingNoteInput {
  note: TrailFleetingNoteContent;
  storage?: TrailFleetingNoteStorage;
  storedAt?: string;
}

function serializeFleetingNote({
  note,
  storage,
  storedAt,
}: TrailSerializeFleetingNoteInput): string {
  const metadata: Record<string, string> = {
    id: note.id,
    created: note.created,
  };

  if (note.cleanupDue !== undefined) {
    metadata.cleanup_due = note.cleanupDue;
  }

  if (storage === "archive" && storedAt !== undefined) {
    metadata.archived_at = storedAt;
  }

  if (storage === "trash" && storedAt !== undefined) {
    metadata.deleted_at = storedAt;
  }

  const text = normalizeFleetingNoteText(note.text);

  return `- ${text} <!-- trail:fleeting ${JSON.stringify(metadata)} -->`;
}

function appendLine(
  markdown: string,
  line: string,
): string {
  const newline = markdown.includes("\r\n")
    ? "\r\n"
    : "\n";

  if (markdown === "") {
    return `${line}${newline}`;
  }

  return markdown.endsWith("\n")
    ? `${markdown}${line}${newline}`
    : `${markdown}${newline}${line}${newline}`;
}

function rejectInvalidFile(
  issues: TrailParseIssue[],
): void {
  const issue = issues[0];

  if (issue) {
    throw new TrailFleetingNoteLifecycleWriteError(
      "fleeting-file-invalid",
      issue.message,
    );
  }
}

function sameFleetingNote(
  left: TrailFleetingNoteContent,
  right: TrailFleetingNoteContent,
): boolean {
  return left.text === right.text.trim()
    && left.created === right.created
    && left.cleanupDue === right.cleanupDue;
}

interface LifecycleMetadata {
  archivedAt?: string;
  deletedAt?: string;
}

function lifecycleMetadata(
  fingerprint: string | undefined,
): LifecycleMetadata | undefined {
  if (fingerprint === undefined) {
    return undefined;
  }

  const match = FLEETING_METADATA_PATTERN.exec(fingerprint);

  if (!match) {
    return undefined;
  }

  let value: unknown;

  try {
    value = JSON.parse(match[1]);
  } catch {
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return {
    ...(typeof value.archived_at === "string"
      ? { archivedAt: value.archived_at }
      : {}),
    ...(typeof value.deleted_at === "string"
      ? { deletedAt: value.deleted_at }
      : {}),
  };
}

function lineNumberAt(
  markdown: string,
  offset: number,
): number {
  return markdown.slice(0, offset).split("\n").length;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value);
}
