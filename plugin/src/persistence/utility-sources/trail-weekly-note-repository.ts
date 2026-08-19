import {
  collectMarkdownH2Records,
  isMarkdownHeading,
  markdownHeadingText,
  normalizeMarkdownRecordBody,
  parseMarkdownBody,
  readMarkdownLine,
  requiredMarkdownOffset,
} from "../../markdown/core/trail-markdown-core";
import {
  TRAIL_COLLECTIONS_PATH,
  TRAIL_WEEKLY_UPDATE_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailWeeklyNoteSnapshot } from "../../markdown/schema/trail-weekly-note-schema";
import type { TrailSourceIO } from "../ports/trail-source-io";

export interface TrailWeeklyNoteRepository {
  archiveCurrent(date: string, current: string): Promise<TrailWeeklyNoteSnapshot>;
  load(): Promise<TrailWeeklyNoteSnapshot>;
  replaceCurrent(current: string): Promise<TrailWeeklyNoteSnapshot>;
}

export const TRAIL_WEEKLY_NOTE_EMPTY_MARKDOWN = "# Current\n\n# Archive\n";

const ARCHIVE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeWeeklyNoteContent(value: string): string {
  return normalizeMarkdownRecordBody(value) ?? "";
}

function requireArchiveDate(value: string): string {
  const match = ARCHIVE_DATE.exec(value);
  if (match === null) throw new Error(`Weekly Note archive heading must be YYYY-MM-DD: ${value}`);
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day
  ) {
    throw new Error(`Weekly Note archive heading is not a valid calendar date: ${value}`);
  }
  return value;
}

function lineEndingFor(markdown: string): "\r\n" | "\n" {
  return markdown.includes("\r\n") ? "\r\n" : "\n";
}

export function parseTrailWeeklyNote(markdown: string): TrailWeeklyNoteSnapshot {
  const root = parseMarkdownBody(markdown);
  const headings = root.children.filter((node) => isMarkdownHeading(node, 1));
  if (headings.length !== 2) {
    throw new Error("Weekly Note must contain exactly '# Current' and '# Archive' sections");
  }

  const [currentHeading, archiveHeading] = headings;
  const currentHeadingIndex = root.children.indexOf(currentHeading);
  const archiveHeadingIndex = root.children.indexOf(archiveHeading);
  if (
    currentHeadingIndex !== 0
    || markdownHeadingText(currentHeading) !== "Current"
    || markdownHeadingText(archiveHeading) !== "Archive"
  ) {
    throw new Error("Weekly Note sections must be '# Current' followed by '# Archive'");
  }

  const currentLine = readMarkdownLine(
    markdown,
    requiredMarkdownOffset(currentHeading, "start"),
  );
  const current = normalizeWeeklyNoteContent(markdown.slice(
    currentLine.nextOffset,
    requiredMarkdownOffset(archiveHeading, "start"),
  ));

  const archiveRegion = collectMarkdownH2Records(
    markdown,
    root.children,
    archiveHeadingIndex + 1,
  );
  if (archiveRegion.orphanNodes.length > 0) {
    throw new Error("Weekly Note Archive may contain only dated H2 entries");
  }

  const archives = archiveRegion.records.map((record) => {
    const date = requireArchiveDate(record.title);
    const headingLine = readMarkdownLine(markdown, record.startOffset);
    return {
      content: normalizeWeeklyNoteContent(markdown.slice(headingLine.nextOffset, record.endOffset)),
      date,
    };
  });
  return { archives, current };
}

export function serializeTrailWeeklyNote(
  snapshot: TrailWeeklyNoteSnapshot,
  lineEnding: "\r\n" | "\n" = "\n",
): string {
  const lines: string[] = ["# Current", ""];
  const current = normalizeWeeklyNoteContent(snapshot.current);
  if (current !== "") lines.push(...current.split("\n"), "");
  lines.push("# Archive");
  for (const archive of snapshot.archives) {
    lines.push("", `## ${requireArchiveDate(archive.date)}`);
    const content = normalizeWeeklyNoteContent(archive.content);
    if (content !== "") lines.push("", ...content.split("\n"));
  }
  return `${lines.join(lineEnding)}${lineEnding}`;
}

async function weeklyNoteExists(io: TrailSourceIO): Promise<boolean> {
  const entries = await io.list(TRAIL_COLLECTIONS_PATH);
  return entries.some((entry) => entry.kind === "file" && entry.path === TRAIL_WEEKLY_UPDATE_PATH);
}

async function loadExisting(io: TrailSourceIO): Promise<TrailWeeklyNoteSnapshot> {
  return parseTrailWeeklyNote(await io.read(TRAIL_WEEKLY_UPDATE_PATH));
}

/** Utility Markdown repository. Weekly Note stays outside Domain Source/Runtime ownership. */
export function createTrailWeeklyNoteRepository(io: TrailSourceIO): TrailWeeklyNoteRepository {
  return {
    async archiveCurrent(date, current) {
      const archiveDate = requireArchiveDate(date);
      const normalizedCurrent = normalizeWeeklyNoteContent(current);
      if (normalizedCurrent === "") return this.load();

      if (!await weeklyNoteExists(io)) {
        const next = {
          archives: [{ content: normalizedCurrent, date: archiveDate }],
          current: "",
        } satisfies TrailWeeklyNoteSnapshot;
        await io.create(TRAIL_WEEKLY_UPDATE_PATH, serializeTrailWeeklyNote(next));
        return loadExisting(io);
      }

      await io.process(TRAIL_WEEKLY_UPDATE_PATH, (latest) => {
        const snapshot = parseTrailWeeklyNote(latest);
        return serializeTrailWeeklyNote({
          archives: [...snapshot.archives, { content: normalizedCurrent, date: archiveDate }],
          current: "",
        }, lineEndingFor(latest));
      });
      return loadExisting(io);
    },

    async load() {
      return await weeklyNoteExists(io)
        ? loadExisting(io)
        : { archives: [], current: "" };
    },

    async replaceCurrent(current) {
      const normalizedCurrent = normalizeWeeklyNoteContent(current);
      if (!await weeklyNoteExists(io)) {
        const next = { archives: [], current: normalizedCurrent } satisfies TrailWeeklyNoteSnapshot;
        await io.create(TRAIL_WEEKLY_UPDATE_PATH, serializeTrailWeeklyNote(next));
        return loadExisting(io);
      }

      await io.process(TRAIL_WEEKLY_UPDATE_PATH, (latest) => {
        const snapshot = parseTrailWeeklyNote(latest);
        return serializeTrailWeeklyNote(
          { ...snapshot, current: normalizedCurrent },
          lineEndingFor(latest),
        );
      });
      return loadExisting(io);
    },
  };
}
