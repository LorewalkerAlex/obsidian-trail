import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { validateTrailWorkspaceGraph } from "../../domain/validation/trail-workspace-validation";
import {
  isTrailPluginDataSnapshot,
  parseTrailPluginData,
} from "../../persistence/plugin-data/trail-plugin-data-codec";
import { parseTrailTestYaml } from "../../test/trail-test-fixtures";
import {
  parseInitiativeMarkdown,
  type TrailInitiativeSourceDocument,
} from "./trail-initiative-codec";
import {
  parseProjectMarkdown,
  type TrailProjectSourceDocument,
} from "./trail-project-codec";

function markdownPaths(directory: string): readonly string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => `${directory}/${name}`);
}

function readInitiativeSource(sourcePath: string): TrailInitiativeSourceDocument {
  const parsed = parseInitiativeMarkdown({
    markdown: readFileSync(sourcePath, "utf8"),
    parseYaml: parseTrailTestYaml,
    sourcePath,
  });
  expect(parsed.issues, sourcePath).toEqual([]);
  if (parsed.document === undefined) throw new Error(`Initiative source was rejected: ${sourcePath}`);
  return parsed.document;
}

function readProjectSource(sourcePath: string): TrailProjectSourceDocument {
  const parsed = parseProjectMarkdown({
    markdown: readFileSync(sourcePath, "utf8"),
    parseYaml: parseTrailTestYaml,
    sourcePath,
  });
  expect(parsed.issues, sourcePath).toEqual([]);
  if (parsed.document === undefined) throw new Error(`Project source was rejected: ${sourcePath}`);
  return parsed.document;
}

function readPluginData() {
  const parsed = parseTrailPluginData(JSON.parse(
    readFileSync(".obsidian/plugins/trail/data.json", "utf8"),
  ));
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error(parsed.issues.map((issue) => issue.message).join("; "));
  }
  expect(isTrailPluginDataSnapshot(parsed.value)).toBe(true);
  if (!isTrailPluginDataSnapshot(parsed.value)) {
    throw new Error("Checked-in plugin data is missing the Workspace Default Project");
  }
  return parsed.value;
}

describe("checked-in development sources", () => {
  it("keeps Initiative and Project fixtures parseable by the production codecs", () => {
    for (const sourcePath of markdownPaths("Trail/Initiatives")) {
      readInitiativeSource(sourcePath);
    }
    for (const sourcePath of markdownPaths("Trail/Projects")) {
      readProjectSource(sourcePath);
    }
  });

  it("keeps the checked-in Initiative and Project graph valid with plugin configuration", () => {
    const pluginData = readPluginData();
    const initiatives = markdownPaths("Trail/Initiatives").map(readInitiativeSource);
    const projects = markdownPaths("Trail/Projects").map(readProjectSource);
    const milestones = projects.flatMap((document) => document.milestones);
    const issues = projects.flatMap((document) => document.issues);

    expect(validateTrailWorkspaceGraph({
      configuration: pluginData.configuration,
      domain: {
        cyclesById: new Map(),
        initiativesById: new Map(
          initiatives.map((document) => [document.initiative.id, document.initiative]),
        ),
        issuesById: new Map(issues.map((issue) => [issue.id, issue])),
        milestonesById: new Map(milestones.map((milestone) => [milestone.id, milestone])),
        projectsById: new Map(
          projects.map((document) => [document.project.id, document.project]),
        ),
      },
      workspaceState: pluginData.workspaceState,
    })).toEqual([]);
  });
});
