import type { App, TAbstractFile, TFile, TFolder } from "obsidian";
import { describe, expect, it } from "vitest";

import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";
import { TRAIL_TRIAGE_EMPTY_MARKDOWN, TRAIL_TRIAGE_PATH } from "./trail-physical-schema";
import { createObsidianTriagePersistenceGateway } from "./trail-triage-persistence-obsidian";

class FakeFile {
  public constructor(
    public readonly name: string,
    public readonly path: string,
  ) {}
}

const fileKinds: ObsidianWorkspaceFileKinds = {
  isFile: (file: TAbstractFile | null): file is TFile => file instanceof FakeFile,
  isFolder: (_file: TAbstractFile | null): _file is TFolder => false,
};

function parseYaml(yaml: string): unknown {
  return { kind: yaml.trim().split(":")[1]?.trim() };
}

function createFixture(initialMarkdown: string): {
  readonly app: Pick<App, "vault">;
  readonly getMarkdown: () => string;
  readonly processInputs: string[];
  readonly setMarkdown: (value: string) => void;
} {
  const file = new FakeFile("Triage.md", TRAIL_TRIAGE_PATH);
  let markdown = initialMarkdown;
  const processInputs: string[] = [];

  const vault = {
    getAbstractFileByPath: (path: string) =>
      path === TRAIL_TRIAGE_PATH ? file : null,
    process: async (
      _file: TFile,
      processor: (data: string) => string,
    ): Promise<string> => {
      processInputs.push(markdown);
      markdown = processor(markdown);
      return markdown;
    },
    read: async (_file: TFile): Promise<string> => markdown,
  };

  return {
    app: { vault } as unknown as Pick<App, "vault">,
    getMarkdown: () => markdown,
    processInputs,
    setMarkdown: (value) => {
      markdown = value;
    },
  };
}

describe("Obsidian Formal Triage persistence adapter", () => {
  it("reads the authoritative singleton and parses it through the production grammar", async () => {
    const fixture = createFixture(TRAIL_TRIAGE_EMPTY_MARKDOWN);
    const gateway = createObsidianTriagePersistenceGateway(
      fixture.app,
      parseYaml,
      fileKinds,
    );

    const result = await gateway.readLatest();

    expect(result.issues).toEqual([]);
    expect(result.contribution.issuesById).toEqual({});
  });

  it("transforms the latest Vault.process snapshot and then rereads the persisted file", async () => {
    const fixture = createFixture(TRAIL_TRIAGE_EMPTY_MARKDOWN);
    fixture.setMarkdown(`${TRAIL_TRIAGE_EMPTY_MARKDOWN}\n## External\n<!-- data {"id":"external","context":"triage","due":10} -->\n`);
    const gateway = createObsidianTriagePersistenceGateway(
      fixture.app,
      parseYaml,
      fileKinds,
    );

    const result = await gateway.appendIssue({
      context: "triage",
      due: 20,
      id: "captured",
      labelIds: [],
      title: "Captured",
    });

    expect(fixture.processInputs[0]).toContain("## External");
    expect(fixture.getMarkdown()).toContain("## Captured");
    expect(Object.keys(result.contribution.issuesById).sort()).toEqual([
      "captured",
      "external",
    ]);
  });

  it("refuses to overwrite an invalid latest snapshot", async () => {
    const invalid = `${TRAIL_TRIAGE_EMPTY_MARKDOWN}\n## Broken\nNo marker\n`;
    const fixture = createFixture(invalid);
    const gateway = createObsidianTriagePersistenceGateway(
      fixture.app,
      parseYaml,
      fileKinds,
    );

    await expect(gateway.appendIssue({
      context: "triage",
      due: 20,
      id: "captured",
      labelIds: [],
      title: "Captured",
    })).rejects.toMatchObject({ code: "source-invalid" });

    expect(fixture.getMarkdown()).toBe(invalid);
  });
});
