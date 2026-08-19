import { describe, expect, it } from "vitest";

import {
  TRAIL_COLLECTIONS_PATH,
  TRAIL_WEEKLY_UPDATE_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailSourceIO } from "../ports/trail-source-io";
import {
  createTrailWeeklyNoteRepository,
  parseTrailWeeklyNote,
  TRAIL_WEEKLY_NOTE_EMPTY_MARKDOWN,
} from "./trail-weekly-note-repository";

function createMemorySourceIO(initial?: string) {
  let persisted = initial;
  let creates = 0;
  let processes = 0;
  const io: TrailSourceIO = {
    create: async (path, content) => {
      expect(path).toBe(TRAIL_WEEKLY_UPDATE_PATH);
      if (persisted !== undefined) throw new Error("already exists");
      creates += 1;
      persisted = content;
    },
    delete: async () => {
      persisted = undefined;
    },
    list: async (path) => {
      expect(path).toBe(TRAIL_COLLECTIONS_PATH);
      return persisted === undefined ? [] : [{
        kind: "file",
        name: "Weekly Update.md",
        path: TRAIL_WEEKLY_UPDATE_PATH,
      }];
    },
    process: async (path, transform) => {
      expect(path).toBe(TRAIL_WEEKLY_UPDATE_PATH);
      if (persisted === undefined) throw new Error("missing");
      processes += 1;
      persisted = transform(persisted);
    },
    read: async (path) => {
      expect(path).toBe(TRAIL_WEEKLY_UPDATE_PATH);
      if (persisted === undefined) throw new Error("missing");
      return persisted;
    },
    rename: async () => undefined,
  };
  return {
    get creates() { return creates; },
    io,
    get persisted() { return persisted; },
    get processes() { return processes; },
  };
}

describe("Trail Weekly Note repository", () => {
  it("keeps a missing utility source lazy until the first write and preserves Markdown whitespace", async () => {
    const memory = createMemorySourceIO();
    const repository = createTrailWeeklyNoteRepository(memory.io);

    await expect(repository.load()).resolves.toEqual({ archives: [], current: "" });
    expect(memory.creates).toBe(0);

    await expect(repository.replaceCurrent("  Plan the week  ")).resolves.toEqual({
      archives: [],
      current: "  Plan the week  ",
    });
    expect(memory.creates).toBe(1);
    expect(memory.persisted).toBe("# Current\n\n  Plan the week  \n\n# Archive\n");
  });

  it("archives supplied Current atomically while preserving earlier entries", async () => {
    const memory = createMemorySourceIO([
      "# Current",
      "",
      "Old current",
      "",
      "# Archive",
      "",
      "## 2026-08-12",
      "",
      "Previous update",
      "",
    ].join("\n"));
    const repository = createTrailWeeklyNoteRepository(memory.io);

    await expect(repository.archiveCurrent("2026-08-19", "Latest update")).resolves.toEqual({
      archives: [
        { content: "Previous update", date: "2026-08-12" },
        { content: "Latest update", date: "2026-08-19" },
      ],
      current: "",
    });
    expect(memory.processes).toBe(1);
    expect(memory.persisted).toContain("## 2026-08-19\n\nLatest update\n");
  });

  it("rejects malformed utility Markdown before a managed rewrite", async () => {
    const memory = createMemorySourceIO("# Current\n\nDraft\n\n# Other\n");
    const repository = createTrailWeeklyNoteRepository(memory.io);

    await expect(repository.replaceCurrent("Replacement"))
      .rejects.toThrow("Weekly Note sections must be '# Current' followed by '# Archive'");
    expect(memory.persisted).toBe("# Current\n\nDraft\n\n# Other\n");
  });

  it("parses the canonical empty utility source", () => {
    expect(parseTrailWeeklyNote(TRAIL_WEEKLY_NOTE_EMPTY_MARKDOWN)).toEqual({
      archives: [],
      current: "",
    });
  });
});
