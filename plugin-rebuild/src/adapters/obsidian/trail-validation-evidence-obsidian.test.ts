import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it } from "vitest";

import { captureObsidianTrailManagedEntries } from "./trail-validation-evidence-obsidian";

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

describe("Obsidian Trail evidence capture", () => {
  it("captures the raw managed tree recursively", async () => {
    const root = new FakeFolder("Trail", "Trail");
    const projects = new FakeFolder("Projects", "Trail/Projects");
    const project = new FakeFile("0001 QA.md", "Trail/Projects/0001 QA.md");
    projects.children.push(project);
    root.children.push(projects);
    const lookup = new Map<string, FakeFile | FakeFolder>([
      [root.path, root],
      [projects.path, projects],
      [project.path, project],
    ]);
    const app = {
      vault: {
        getAbstractFileByPath: (path: string) => lookup.get(path) ?? null,
        read: async (file: TFile) => `content:${file.path}`,
      },
    } as unknown as Pick<App, "vault">;

    const entries = await captureObsidianTrailManagedEntries(app, fileKinds);

    expect(entries).toEqual([
      { kind: "directory", path: "Trail" },
      { kind: "directory", path: "Trail/Projects" },
      { content: `content:${project.path}`, kind: "file", path: project.path },
    ]);
  });
});
