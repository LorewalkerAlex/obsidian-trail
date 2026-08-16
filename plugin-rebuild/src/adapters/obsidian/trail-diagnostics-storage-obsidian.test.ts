import { describe, expect, it } from "vitest";

import {
  createObsidianDiagnosticStorage,
  type TrailDiagnosticFileAdapter,
} from "./trail-diagnostics-storage-obsidian";

class MemoryAdapter implements TrailDiagnosticFileAdapter {
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
    if (value === undefined) throw new Error(`missing file: ${path}`);
    return value;
  }
  public async write(path: string, data: string): Promise<void> {
    this.files.set(path, data);
  }
}

function line(sessionId: string, sequence: number): string {
  return `${JSON.stringify({ sessionId, sequence })}\n`;
}

describe("Obsidian diagnostic storage", () => {
  it("retains recent JSONL sessions and writes one stable evidence file", async () => {
    const adapter = new MemoryAdapter();
    const directory = ".config/plugins/trail/diagnostics";
    const storage = createObsidianDiagnosticStorage(adapter, directory);

    await storage.beginSession("a");
    await storage.appendLine(line("a", 1));
    await storage.appendLine(line("b", 1));
    await storage.writeValidationEvidence("{\"version\":1}");

    await expect(storage.readRecentSessions(1)).resolves.toBe(line("b", 1));
    expect(adapter.files.get(storage.evidencePath)).toBe("{\"version\":1}");
    expect(storage.evidencePath).toBe(`${directory}/validation-evidence.json`);
  });
});
