import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it, vi } from "vitest";

import { createObsidianWorkspaceLayoutIO } from "./trail-workspace-layout-io-obsidian";

class FakeFile {
  public constructor(public path: string) {}
}
class FakeFolder {
  public readonly children: Array<FakeFile | FakeFolder> = [];
  public constructor(public path: string) {}
}

const fileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof FakeFile,
  isFolder: (file: TAbstractFile | null): file is TFolder => file instanceof FakeFolder,
};

describe("Obsidian WorkspaceLayoutIO", () => {
  it("classifies paths and creates/removes only empty directories", async () => {
    const entries = new Map<string, FakeFile | FakeFolder>();
    const trashFile = vi.fn(async (target: TAbstractFile) => {
      entries.delete((target as unknown as FakeFolder).path);
    });
    const app = {
      fileManager: { trashFile },
      vault: {
        createFolder: async (path: string) => {
          entries.set(path, new FakeFolder(path));
        },
        getAbstractFileByPath: (path: string) => entries.get(path) ?? null,
      },
    } as unknown as Pick<App, "fileManager" | "vault">;
    const layout = createObsidianWorkspaceLayoutIO(app, fileKinds);

    expect(await layout.pathKind("Trail")).toBe("missing");
    await layout.createDirectory("Trail");
    expect(await layout.pathKind("Trail")).toBe("directory");
    entries.set("Trail/file.md", new FakeFile("Trail/file.md"));
    expect(await layout.pathKind("Trail/file.md")).toBe("file");
    await layout.removeDirectoryIfEmpty("Trail");
    expect(trashFile).toHaveBeenCalledOnce();
  });

  it("refuses to remove a non-empty directory", async () => {
    const folder = new FakeFolder("Trail");
    folder.children.push(new FakeFile("Trail/file.md"));
    const app = {
      fileManager: { trashFile: vi.fn() },
      vault: { getAbstractFileByPath: () => folder },
    } as unknown as Pick<App, "fileManager" | "vault">;
    const layout = createObsidianWorkspaceLayoutIO(app, fileKinds);

    await expect(layout.removeDirectoryIfEmpty("Trail")).rejects.toThrow("non-empty");
  });
});
