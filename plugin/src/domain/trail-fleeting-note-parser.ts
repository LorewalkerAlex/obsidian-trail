import type {
  TrailFleetingNote,
  TrailParseIssue,
} from "./trail-model";
import type { TrailMarkdownInput } from "./trail-parser";

interface FleetingMetadata {
  id: string;
  created: string;
  cleanupDue?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
const FLEETING_LINE_PATTERN =
  /^- (.+?)\s*<!--\s*trail:fleeting\s+(.+?)\s*-->\s*$/;

export interface TrailFleetingNotesParseResult {
  notes: TrailFleetingNote[];
  issues: TrailParseIssue[];
}

export function parseFleetingNotes(
  input: TrailMarkdownInput,
): TrailFleetingNotesParseResult {
  const notes: TrailFleetingNote[] = [];
  const issues: TrailParseIssue[] = [];
  const ids = new Set<string>();

  for (const line of markdownLines(input.markdown)) {
    const content = line.content.replace(/\r$/, "");

    if (content.trim() === "") {
      continue;
    }

    if (!content.startsWith("- ")) {
      issues.push(fileIssue(
        input.filePath,
        "fleeting.file.content.invalid",
        "Fleeting Notes may contain only top-level list items and blank lines.",
        line.number,
      ));
      continue;
    }

    const result = parseFleetingNote(
      input.filePath,
      content,
      line.startOffset,
      line.endOffset,
      input.markdown.slice(line.startOffset, line.endOffset),
      line.number,
    );

    issues.push(...result.issues);
    if (!result.note) {
      continue;
    }

    if (ids.has(result.note.id)) {
      issues.push(fleetingIssue(
        input.filePath,
        line.number,
        "fleeting.id.duplicate",
        `Duplicate Fleeting Note id: ${result.note.id}.`,
        result.note.id,
      ));
      continue;
    }

    ids.add(result.note.id);
    notes.push(result.note);
  }

  return { notes, issues };
}

function parseFleetingNote(
  filePath: string,
  line: string,
  startOffset: number,
  endOffset: number,
  fingerprint: string,
  lineNumber: number,
): { note?: TrailFleetingNote; issues: TrailParseIssue[] } {
  const match = FLEETING_LINE_PATTERN.exec(line);
  const commentCount =
    line.match(/<!--\s*trail:fleeting\b/g)?.length ?? 0;

  if (!match || commentCount !== 1) {
    return {
      issues: [fleetingIssue(
        filePath,
        lineNumber,
        "fleeting.syntax.invalid",
        "Fleeting Note must contain one valid trail:fleeting comment on its list item line.",
      )],
    };
  }

  const metadata = fleetingMetadata(match[2]);
  if (!metadata) {
    return {
      issues: [fleetingIssue(
        filePath,
        lineNumber,
        "fleeting.metadata.invalid",
        "trail:fleeting metadata contains invalid JSON or fields.",
        metadataId(match[2]),
      )],
    };
  }

  const text = match[1].trim();
  if (text === "") {
    return {
      issues: [fleetingIssue(
        filePath,
        lineNumber,
        "fleeting.text.invalid",
        "Fleeting Note text must not be empty.",
        metadata.id,
      )],
    };
  }

  return {
    note: {
      id: metadata.id,
      text,
      created: metadata.created,
      ...(metadata.cleanupDue === undefined
        ? {}
        : { cleanupDue: metadata.cleanupDue }),
      source: {
        filePath,
        startOffset,
        endOffset,
        fingerprint,
      },
    },
    issues: [],
  };
}

function fleetingMetadata(
  json: string,
): FleetingMetadata | undefined {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    return undefined;
  }

  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || !UUID_PATTERN.test(value.id)
    || typeof value.created !== "string"
    || !TIMESTAMP_PATTERN.test(value.created)
    || (
      value.cleanup_due !== undefined
      && (
        typeof value.cleanup_due !== "string"
        || !DATE_PATTERN.test(value.cleanup_due)
      )
    )
  ) {
    return undefined;
  }

  return {
    id: value.id,
    created: value.created,
    ...(value.cleanup_due === undefined
      ? {}
      : { cleanupDue: value.cleanup_due }),
  };
}

function metadataId(json: string): string | undefined {
  try {
    const value: unknown = JSON.parse(json);
    return isRecord(value) && typeof value.id === "string"
      ? value.id
      : undefined;
  } catch {
    const match = /"id"\s*:\s*"([^"]+)"/.exec(json);
    return match?.[1];
  }
}

interface MarkdownLine {
  content: string;
  startOffset: number;
  endOffset: number;
  number: number;
}

function markdownLines(markdown: string): MarkdownLine[] {
  const lines: MarkdownLine[] = [];
  let startOffset = 0;
  let number = 1;

  while (startOffset < markdown.length) {
    const newlineOffset = markdown.indexOf("\n", startOffset);
    const endOffset = newlineOffset < 0
      ? markdown.length
      : newlineOffset + 1;

    lines.push({
      content: markdown.slice(
        startOffset,
        newlineOffset < 0 ? markdown.length : newlineOffset,
      ),
      startOffset,
      endOffset,
      number,
    });

    startOffset = endOffset;
    number += 1;
  }

  return lines;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value);
}

function fileIssue(
  filePath: string,
  code: string,
  message: string,
  line?: number,
): TrailParseIssue {
  return {
    scope: "file",
    code,
    message,
    filePath,
    ...(line === undefined ? {} : { line }),
  };
}

function fleetingIssue(
  filePath: string,
  line: number,
  code: string,
  message: string,
  objectId?: string,
): TrailParseIssue {
  return {
    scope: "fleeting",
    code,
    message,
    filePath,
    line,
    ...(objectId === undefined ? {} : { objectId }),
  };
}
