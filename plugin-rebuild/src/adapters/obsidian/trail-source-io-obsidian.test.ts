import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { createObsidianSourceIO } from "./trail-source-io-obsidian";
import { createTrailHostWriteGuard } from "./trail-vault-events-obsidian";

class FakeFile {
  public constructor(public name: string, public path: string) {}
}

class FakeFolder {
  public readonly children: Array<FakeFile | FakeFolder> = [];
  public constructor(public name: string, public path: string) {}
}

const fileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof FakeFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof FakeFolder,
};

describe("Obsidian SourceIO", () => {
  it("adapts create/list/process/read without Domain knowledge", async () => {
    const root = new FakeFolder("Projects", "Trail/Projects");
    const markdownByPath = new Map<string, string>();
    const lookup = (path: string): FakeFile | FakeFolder | null => {
      if (path === root.path) return root;
      return root.children.find((child) => child.path === path) ?? null;
    };
    const vault = {
      create: async (path: string, content: string) => {
        const file = new FakeFile(path.split("/").pop() ?? path, path);
        root.children.push(file);
        markdownByPath.set(path, content);
        return file;
      },
      getAbstractFileByPath: lookup,
      process: async (file: TFile, transform: (latest: string) => string) => {
        const latest = markdownByPath.get(file.path);
        if (latest === undefined) throw new Error("missing markdown");
        markdownByPath.set(file.path, transform(latest));
      },
      read: async (file: TFile) => markdownByPath.get(file.path) ?? "",
    };
    const sourceIO = createObsidianSourceIO(
      { vault } as unknown as Pick<App, "vault">,
      fileKinds,
    );
    const path = "Trail/Projects/0001 Project.md";

    await sourceIO.create(path, "initial");
    expect(await sourceIO.list(root.path)).toEqual([{
      kind: "file",
      name: "0001 Project.md",
      path,
    }]);
    await sourceIO.process(path, (latest) => `${latest}\nupdated`);
    expect(await sourceIO.read(path)).toBe("initial\nupdated");
  });

  it("keeps the exact Trail-owned event guard active only for the host write", async () => {
    const file = new FakeFile("Triage.md", "Trail/Collections/Triage.md");
    const writeGuard = createTrailHostWriteGuard();
    let consumedDuringWrite = false;
    const sourceIO = createObsidianSourceIO({
      vault: {
        getAbstractFileByPath: () => file,
        process: async (_file: TFile, transform: (latest: string) => string) => {
          consumedDuringWrite = writeGuard.consume({ kind: "modify", path: file.path });
          transform("before");
        },
        read: async () => "before",
      },
    } as unknown as Pick<App, "vault">, fileKinds, writeGuard);

    await sourceIO.process(file.path, () => "after");

    expect(consumedDuringWrite).toBe(true);
    expect(writeGuard.consume({ kind: "modify", path: file.path })).toBe(false);
  });

  it("delegates rename/delete to Obsidian fileManager and fails closed without it", async () => {
    const file = new FakeFile("Old.md", "Trail/Old.md");
    const trashFile = vi.fn(async (_target: TAbstractFile) => undefined);
    const renameFile = vi.fn(async (target: TAbstractFile, to: string) => {
      (target as unknown as FakeFile).path = to;
    });
    const sourceIO = createObsidianSourceIO({
      fileManager: { renameFile, trashFile },
      vault: { getAbstractFileByPath: (path: string) => path === file.path ? file : null },
    } as unknown as Pick<App, "vault"> & Partial<Pick<App, "fileManager">>, fileKinds);

    await sourceIO.rename("Trail/Old.md", "Trail/New.md");
    await sourceIO.delete("Trail/New.md");
    expect(renameFile).toHaveBeenCalledOnce();
    expect(trashFile).toHaveBeenCalledOnce();

    const withoutFileManager = createObsidianSourceIO({
      vault: { getAbstractFileByPath: () => file },
    } as unknown as Pick<App, "vault">, fileKinds);
    await expect(withoutFileManager.delete(file.path)).rejects.toThrow("fileManager");
  });
});
