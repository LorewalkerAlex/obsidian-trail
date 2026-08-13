import { describe, expect, it } from "vitest";

import {
  createObsidianDiagnosticPersistence,
  type TrailDiagnosticAdapter,
} from "./trail-diagnostics-obsidian";

class MemoryAdapter implements TrailDiagnosticAdapter {
  public readonly directories = new Set<string>();
  public readonly files = new Map<string, string>();

  public async append(path: string, data: string): Promise<void> {
    this.files.set(path, `${this.files.get(path) ?? ""}${data}`);
  }

  public async exists(path: string): Promise<boolean> {
    return this.directories.has(path) || this.files.has(path);
  }

  public async mkdir(path: string): Promise<void> {
    this.directories.add(path);
  }

  public async read(path: string): Promise<string> {
    const value = this.files.get(path);
    if (value === undefined) {
      throw new Error(`missing file: ${path}`);
    }
    return value;
  }

  public async write(path: string, data: string): Promise<void> {
    this.files.set(path, data);
  }
}

function line(sessionId: string, sequence: number): string {
  return `${JSON.stringify({ sessionId, sequence })}\n`;
}

describe("Obsidian diagnostic persistence", () => {
  it("stores JSONL in the hidden plugin directory and returns recent sessions", async () => {
    const adapter = new MemoryAdapter();
    const persistence = createObsidianDiagnosticPersistence(
      adapter,
      ".config-test/plugins/trail/diagnostics",
    );

    await persistence.beginSession("session-a");
    await persistence.appendLine(line("session-a", 1));
    await persistence.appendLine(line("session-b", 1));
    await persistence.appendLine(line("session-b", 2));

    await expect(persistence.readRecentSessions(1)).resolves.toBe(
      `${line("session-b", 1)}${line("session-b", 2)}`,
    );
    expect(adapter.directories).toContain(
      ".config-test/plugins/trail/diagnostics",
    );
  });

  it("retains only one previous session when a new session begins", async () => {
    const adapter = new MemoryAdapter();
    const directory = ".config-test/plugins/trail/diagnostics";
    const filePath = `${directory}/trace.jsonl`;
    adapter.directories.add(directory);
    adapter.files.set(
      filePath,
      ["a", "b", "c", "d", "e"].map((sessionId) => line(sessionId, 1)).join(""),
    );
    const persistence = createObsidianDiagnosticPersistence(adapter, directory);

    await persistence.beginSession("f");

    expect(adapter.files.get(filePath)).toBe(line("e", 1));
  });

  it("keeps at most two sessions and the latest 2000 events per session", async () => {
    const adapter = new MemoryAdapter();
    const directory = ".config-test/plugins/trail/diagnostics";
    const filePath = `${directory}/trace.jsonl`;
    adapter.directories.add(directory);
    adapter.files.set(filePath, line("previous", 1));
    const persistence = createObsidianDiagnosticPersistence(adapter, directory);
    const replacement = Array.from(
      { length: 2_001 },
      (_, index) => line("current", index + 1),
    );

    await persistence.replaceSession("current", replacement);

    const stored = adapter.files.get(filePath) ?? "";
    expect(stored).toContain(line("previous", 1).trim());
    expect(stored).not.toContain(line("current", 1).trim());
    expect(stored).toContain(line("current", 2).trim());
    expect(stored).toContain(line("current", 2_001).trim());
    expect(stored.trim().split("\n")).toHaveLength(2_001);
  });
});
