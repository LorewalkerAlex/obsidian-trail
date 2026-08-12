import {
  describe,
  expect,
  it,
} from "vitest";

import {
  TRAIL_FLEETING_NOTES_PATH,
} from "./trail-fleeting-note-lifecycle";
import {
  createFleetingNoteInVault,
  TrailFleetingNoteLifecycleMutationError,
  type TrailFleetingNoteLifecycleSource,
  updateFleetingNoteInVault,
} from "./trail-fleeting-note-lifecycle-service";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import type { TrailMutableFile } from "./trail-mutation-service";

const NOTE_ID = "6bce718b-03df-4a9a-865d-b374139a962e";
const CREATED_AT = "2026-08-06T14:50:00+08:00";

interface TestFile extends TrailMutableFile {
  path: string;
}

interface TestSource {
  source: TrailFleetingNoteLifecycleSource<TestFile>;
  read(): string | undefined;
  write(markdown: string): void;
}

function createSource(initial?: string): TestSource {
  let markdown = initial;

  return {
    read: () => markdown,
    write: (next) => {
      markdown = next;
    },
    source: {
      getFileByPath: (path) =>
        path === TRAIL_FLEETING_NOTES_PATH
        && markdown !== undefined
          ? { path }
          : null,
      processOrCreate: async (_path, update) => {
        const next = update(markdown ?? "");
        markdown = next;
        return next;
      },
      process: async (_file, update) => {
        const next = update(markdown ?? "");
        markdown = next;
        return next;
      },
    },
  };
}

function requireNote(markdown: string) {
  const result = parseFleetingNotes({
    filePath: TRAIL_FLEETING_NOTES_PATH,
    markdown,
  });
  const note = result.notes[0];

  if (!note) {
    throw new Error("Expected one Fleeting Note.");
  }

  return note;
}

describe("Trail Fleeting Note create and edit service", () => {
  it("creates the active lifecycle file and confirms the new Note", async () => {
    const testSource = createSource();

    const note = await createFleetingNoteInVault(
      testSource.source,
      {
        note: {
          id: NOTE_ID,
          text: "Quick capture",
          created: CREATED_AT,
        },
      },
    );

    expect(note).toMatchObject({
      id: NOTE_ID,
      text: "Quick capture",
      created: CREATED_AT,
    });
    expect(testSource.read()).toContain(NOTE_ID);
  });

  it("appends a new Note without changing an existing Note", async () => {
    const existingId = "8ae1f03d-5944-4ee2-9882-0e4ed96b1d45";
    const existing =
      `- Existing <!-- trail:fleeting {"id":"${existingId}","created":"${CREATED_AT}"} -->\n`;
    const testSource = createSource(existing);

    await createFleetingNoteInVault(testSource.source, {
      note: {
        id: NOTE_ID,
        text: "New note",
        created: CREATED_AT,
      },
    });

    expect(testSource.read()).toBe(
      `${existing}- New note <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}"} -->\n`,
    );
  });

  it("updates an existing Note and returns its latest source", async () => {
    const initial =
      `- Original <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}"} -->\n`;
    const testSource = createSource(initial);
    const expectedNote = requireNote(initial);

    const updated = await updateFleetingNoteInVault(
      testSource.source,
      {
        expectedNote,
        text: "Updated",
      },
    );

    expect(updated.text).toBe("Updated");
    expect(updated.source.fingerprint).toContain("Updated");
    expect(testSource.read()).toContain("- Updated ");
  });

  it("reports a missing active file before editing", async () => {
    const testSource = createSource();
    const expectedNote = requireNote(
      `- Original <!-- trail:fleeting {"id":"${NOTE_ID}","created":"${CREATED_AT}"} -->\n`,
    );

    await expect(updateFleetingNoteInVault(
      testSource.source,
      { expectedNote, text: "Updated" },
    )).rejects.toMatchObject({
      code: "fleeting-file-not-found",
    });
  });

  it("does not write an invalid Quick Capture value", async () => {
    const testSource = createSource();

    await expect(createFleetingNoteInVault(
      testSource.source,
      {
        note: {
          id: NOTE_ID,
          text: "one\ntwo",
          created: CREATED_AT,
        },
      },
    )).rejects.toThrow();
    expect(testSource.read()).toBeUndefined();
  });

  it("wraps an unexpected Vault create failure", async () => {
    const testSource = createSource();
    testSource.source.processOrCreate = () =>
      Promise.reject(new Error("Injected failure."));

    await expect(createFleetingNoteInVault(
      testSource.source,
      {
        note: {
          id: NOTE_ID,
          text: "Quick capture",
          created: CREATED_AT,
        },
      },
    )).rejects.toBeInstanceOf(
      TrailFleetingNoteLifecycleMutationError,
    );
  });
});
