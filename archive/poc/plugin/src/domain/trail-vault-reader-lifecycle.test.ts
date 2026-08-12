import {
  describe,
  expect,
  it,
} from "vitest";

import {
  TRAIL_FLEETING_ARCHIVE_PATH,
  TRAIL_FLEETING_NOTES_PATH,
  TRAIL_FLEETING_TRASH_PATH,
} from "./trail-fleeting-note-lifecycle";
import {
  isTrailDataEventPath,
  readTrailVault,
  type TrailReadableFile,
  type TrailVaultSource,
} from "./trail-vault-reader";

const ACTIVE_ID = "6bce718b-03df-4a9a-865d-b374139a962e";
const ARCHIVED_ID = "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45";
const TRASHED_ID = "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const CREATED_AT = "2026-08-06T10:30:00+08:00";
const STORED_AT = "2026-08-06T10:35:00+08:00";

interface TestFile extends TrailReadableFile {
  path: string;
  basename: string;
}

function createSource(): TrailVaultSource<TestFile> {
  const markdownByPath = new Map<string, string>([
    [
      TRAIL_FLEETING_NOTES_PATH,
      `- Active note <!-- trail:fleeting {"id":"${ACTIVE_ID}","created":"${CREATED_AT}"} -->\n`,
    ],
    [
      TRAIL_FLEETING_ARCHIVE_PATH,
      `- Archived note <!-- trail:fleeting {"id":"${ARCHIVED_ID}","created":"${CREATED_AT}","archived_at":"${STORED_AT}"} -->\n`,
    ],
    [
      TRAIL_FLEETING_TRASH_PATH,
      `- Deleted note <!-- trail:fleeting {"id":"${TRASHED_ID}","created":"${CREATED_AT}","deleted_at":"${STORED_AT}"} -->\n`,
    ],
  ]);
  const files = [...markdownByPath.keys()].map(
    (path): TestFile => ({
      path,
      basename: "Fleeting Notes",
    }),
  );

  return {
    getMarkdownFiles: () => files,
    cachedRead: async (file) =>
      markdownByPath.get(file.path) ?? "",
    getFrontmatter: () => undefined,
  };
}

describe("Trail Vault reader Fleeting Note lifecycle", () => {
  it("reads active, archived, and deleted Fleeting Notes", async () => {
    const result = await readTrailVault(createSource());

    expect(result.fleetingNotes.map((note) => note.id))
      .toEqual([ACTIVE_ID]);
    expect(result.archivedFleetingNotes).toEqual([
      expect.objectContaining({
        id: ARCHIVED_ID,
        storage: "archive",
        storedAt: STORED_AT,
      }),
    ]);
    expect(result.trashedFleetingNotes).toEqual([
      expect.objectContaining({
        id: TRASHED_ID,
        storage: "trash",
        storedAt: STORED_AT,
      }),
    ]);
    expect(result.issues).toEqual([]);
  });

  it("preserves both records from a partial lifecycle mutation", async () => {
    const source = createSource();
    const originalRead = source.cachedRead.bind(source);

    source.cachedRead = async (file) => {
      if (file.path === TRAIL_FLEETING_ARCHIVE_PATH) {
        return `- Active note <!-- trail:fleeting {"id":"${ACTIVE_ID}","created":"${CREATED_AT}","archived_at":"${STORED_AT}"} -->\n`;
      }

      return originalRead(file);
    };

    const result = await readTrailVault(source);

    expect(result.fleetingNotes.map((note) => note.id))
      .toEqual([ACTIVE_ID]);
    expect(result.archivedFleetingNotes?.map((note) => note.id))
      .toEqual([ACTIVE_ID]);
    expect(result.issues).toContainEqual({
      scope: "fleeting",
      code: "fleeting.id.duplicate",
      message:
        `Fleeting Note UUID "${ACTIVE_ID}" is present in more than one lifecycle file.`,
      filePath: TRAIL_FLEETING_ARCHIVE_PATH,
      objectId: ACTIVE_ID,
    });
  });

  it("reconciles lifecycle folders and files", () => {
    expect(isTrailDataEventPath("Trail/Archive")).toBe(true);
    expect(isTrailDataEventPath("Trail/Trash")).toBe(true);
    expect(
      isTrailDataEventPath(TRAIL_FLEETING_ARCHIVE_PATH),
    ).toBe(true);
    expect(
      isTrailDataEventPath(TRAIL_FLEETING_TRASH_PATH),
    ).toBe(true);
    expect(
      isTrailDataEventPath("Trail/Archive/Other.md"),
    ).toBe(false);
  });
});
