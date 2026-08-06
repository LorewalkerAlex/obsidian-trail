import {
  describe,
  expect,
  it,
} from "vitest";

import {
  TrailCrossFileMutationError,
} from "./trail-cross-file-mutation";
import {
  restoreFleetingNoteInVault,
  storeFleetingNoteInVault,
} from "./trail-fleeting-note-lifecycle-command";
import {
  TRAIL_FLEETING_ARCHIVE_PATH,
  TRAIL_FLEETING_NOTES_PATH,
  TRAIL_FLEETING_TRASH_PATH,
} from "./trail-fleeting-note-lifecycle";
import type {
  TrailFleetingNoteLifecycleSource,
} from "./trail-fleeting-note-lifecycle-service";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import type { TrailMutableFile } from "./trail-mutation-service";

const NOTE_ID = "6bce718b-03df-4a9a-865d-b374139a962e";
const CREATED_AT = "2026-08-06T10:30:00+08:00";
const STORED_AT = "2026-08-06T10:35:00+08:00";
const activeLine =
  `- Lifecycle command <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}"} -->`;

interface TestFile extends TrailMutableFile {
  path: string;
}

interface TestLifecycleSource {
  source: TrailFleetingNoteLifecycleSource<TestFile>;
  read(path: string): string | undefined;
  failNextProcess(path: string): void;
  failCreate(path: string): void;
}

function createSource(): TestLifecycleSource {
  const files = new Map<string, string>([
    [TRAIL_FLEETING_NOTES_PATH, `${activeLine}\n`],
  ]);
  const processFailures = new Set<string>();
  const createFailures = new Set<string>();

  return {
    read: (path) => files.get(path),
    failNextProcess: (path) => {
      processFailures.add(path);
    },
    failCreate: (path) => {
      createFailures.add(path);
    },
    source: {
      getFileByPath: (path) => files.has(path)
        ? { path }
        : null,
      processOrCreate: async (path, update) => {
        if (createFailures.has(path)) {
          throw new Error("Injected create failure.");
        }
        const current = files.get(path) ?? "";
        const next = update(current);
        files.set(path, next);
        return next;
      },
      process: async (file, update) => {
        if (processFailures.delete(file.path)) {
          throw new Error("Injected process failure.");
        }
        const current = files.get(file.path) ?? "";
        const next = update(current);
        files.set(file.path, next);
        return next;
      },
    },
  };
}

describe("Trail Fleeting Note lifecycle commands", () => {
  it("archives an active Fleeting Note", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );

    const storedNote = await storeFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        storage: "archive",
        storedAt: STORED_AT,
      },
    );

    expect(storedNote).toMatchObject({
      id: NOTE_ID,
      storage: "archive",
      storedAt: STORED_AT,
    });
    expect(
      testSource.read(TRAIL_FLEETING_NOTES_PATH),
    ).not.toContain(NOTE_ID);
    expect(
      testSource.read(TRAIL_FLEETING_ARCHIVE_PATH),
    ).toContain(NOTE_ID);
  });

  it("moves a deleted Fleeting Note to Trash", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );

    const storedNote = await storeFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        storage: "trash",
        storedAt: STORED_AT,
      },
    );

    expect(storedNote.storage).toBe("trash");
    expect(
      testSource.read(TRAIL_FLEETING_TRASH_PATH),
    ).toContain(`"deleted_at":"${STORED_AT}"`);
  });

  it("restores an archived Fleeting Note", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );
    const storedNote = await storeFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        storage: "archive",
        storedAt: STORED_AT,
      },
    );

    const restoredNote = await restoreFleetingNoteInVault(
      testSource.source,
      { expectedNote: storedNote },
    );

    expect(restoredNote).toMatchObject({
      id: NOTE_ID,
      text: "Lifecycle command",
      created: CREATED_AT,
    });
    expect(
      testSource.read(TRAIL_FLEETING_NOTES_PATH),
    ).toContain(NOTE_ID);
    expect(
      testSource.read(TRAIL_FLEETING_ARCHIVE_PATH),
    ).not.toContain(NOTE_ID);
  });

  it("compensates storage when active removal fails", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );
    testSource.failNextProcess(TRAIL_FLEETING_NOTES_PATH);

    await expect(storeFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        storage: "archive",
        storedAt: STORED_AT,
      },
    )).rejects.toMatchObject({
      outcome: "compensated",
    });
    expect(
      testSource.read(TRAIL_FLEETING_NOTES_PATH),
    ).toContain(NOTE_ID);
    expect(
      testSource.read(TRAIL_FLEETING_ARCHIVE_PATH),
    ).not.toContain(NOTE_ID);
  });

  it("reports partial when active removal and compensation both fail", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );
    testSource.failNextProcess(TRAIL_FLEETING_NOTES_PATH);
    testSource.failNextProcess(TRAIL_FLEETING_ARCHIVE_PATH);

    await expect(storeFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        storage: "archive",
        storedAt: STORED_AT,
      },
    )).rejects.toMatchObject({
      outcome: "partial",
    });
    expect(
      testSource.read(TRAIL_FLEETING_NOTES_PATH),
    ).toContain(NOTE_ID);
    expect(
      testSource.read(TRAIL_FLEETING_ARCHIVE_PATH),
    ).toContain(NOTE_ID);
  });

  it("reports unchanged when the lifecycle target cannot be created", async () => {
    const testSource = createSource();
    const expectedNote = requireActiveNote(
      testSource.read(TRAIL_FLEETING_NOTES_PATH) ?? "",
    );
    testSource.failCreate(TRAIL_FLEETING_ARCHIVE_PATH);

    const error = await captureError(
      () => storeFleetingNoteInVault(
        testSource.source,
        {
          expectedNote,
          storage: "archive",
          storedAt: STORED_AT,
        },
      ),
    );

    expect(error).toBeInstanceOf(
      TrailCrossFileMutationError,
    );
    expect(error).toMatchObject({
      outcome: "unchanged",
    });
    expect(
      testSource.read(TRAIL_FLEETING_NOTES_PATH),
    ).toContain(NOTE_ID);
    expect(
      testSource.read(TRAIL_FLEETING_ARCHIVE_PATH),
    ).toBeUndefined();
  });
});

function requireActiveNote(markdown: string) {
  const result = parseFleetingNotes({
    filePath: TRAIL_FLEETING_NOTES_PATH,
    markdown,
  });
  const note = result.notes[0];

  if (!note) {
    throw new Error("Expected one active Fleeting Note.");
  }

  return note;
}

async function captureError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error: unknown) {
    return error;
  }

  throw new Error("Expected the lifecycle command to fail.");
}
