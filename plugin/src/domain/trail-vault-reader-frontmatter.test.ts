import { describe, expect, it } from "vitest";

import {
  createTrailFrontmatterParser,
  readTrailVault,
  type TrailReadableFile,
  type TrailVaultSource,
} from "./trail-vault-reader";

const AREA_ID = "df4ec59e-bfe4-4a09-a079-43ff9350642d";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const TASK_ID = "fa3b3a46-f818-416a-9dd0-59aa168bc467";

function createFile(path: string): TrailReadableFile {
  const fileName = path.split("/").pop();
  if (!fileName) {
    throw new Error(`Invalid test file path: ${path}`);
  }

  return {
    path,
    basename: fileName.replace(/\.md$/, ""),
  };
}

function getFrontMatterInfo(markdown: string): {
  exists: boolean;
  frontmatter: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    markdown,
  );

  return {
    exists: match !== null,
    frontmatter: match?.[1] ?? "",
  };
}
function parseFixtureYaml(
  yaml: string,
): Record<string, unknown> {
  if (yaml.includes("status: active")) {
    return {
      id: PROJECT_ID,
      created: "2026-08-04",
      status: "active",
    };
  }

  return {
    id: AREA_ID,
    created: "2026-08-04",
  };
}
describe("Trail Vault reader frontmatter consistency", () => {
  it("parses frontmatter from the same Markdown snapshot", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const projectPath = "Trail/Areas/Work/Trail POC.md";
    const areaMarkdown = [
      "---",
      `id: "${AREA_ID}"`,
      "created: 2026-08-04",
      "---",
      "",
      "Area description.",
      "",
    ].join("\n");
    const projectMarkdown = [
      "---",
      `id: "${PROJECT_ID}"`,
      "created: 2026-08-04",
      "status: active",
      "---",
      "",
      "## Overview",
      "",
      "Project overview.",
      "",
      "## Tasks",
      "",
      `- [ ] Current Task <!-- trail:task {"id":"${TASK_ID}","status":"todo","priority":"medium","created":"2026-08-04T10:00:00+08:00","labels":[]} -->`,
      "",
      "## Notes",
      "",
      "- Project note.",
      "",
    ].join("\n");
    const markdownByPath: Record<string, string> = {
      [areaPath]: areaMarkdown,
      [projectPath]: projectMarkdown,
    };
    const frontmatterMarkdownByPath = new Map<string, string>();
    const parseFrontmatter = createTrailFrontmatterParser(
      getFrontMatterInfo,
      parseFixtureYaml,
    );
    const source: TrailVaultSource<TrailReadableFile> = {
      getMarkdownFiles: () => [
        createFile(projectPath),
        createFile(areaPath),
      ],
      cachedRead: (file) =>
        Promise.resolve(markdownByPath[file.path] ?? ""),
      getFrontmatter: (file, markdown) => {
        frontmatterMarkdownByPath.set(file.path, markdown);
        return parseFrontmatter(markdown);
      },
    };
    const result = await readTrailVault(source);

    expect(result.issues).toEqual([]);
    expect(result.areas).toHaveLength(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      id: PROJECT_ID,
      status: "active",
    });
    expect(frontmatterMarkdownByPath.get(areaPath)).toBe(
      areaMarkdown,
    );
    expect(frontmatterMarkdownByPath.get(projectPath)).toBe(
      projectMarkdown,
    );
  });
  it("accepts one leading UTF-8 BOM before frontmatter", () => {
    const parseFrontmatter = createTrailFrontmatterParser(
      getFrontMatterInfo,
      parseFixtureYaml,
    );
    const markdown = [
      "\uFEFF---",
      `id: "${PROJECT_ID}"`,
      "created: 2026-08-04",
      "status: active",
      "---",
      "",
    ].join("\n");

    expect(parseFrontmatter(markdown)).toEqual({
      id: PROJECT_ID,
      created: "2026-08-04",
      status: "active",
    });
  });
  it("strips one leading BOM from the parsed Area body", async () => {
    const areaPath = "Trail/Areas/Work/Area.md";
    const areaMarkdown = [
      "\uFEFF---",
      `id: "${AREA_ID}"`,
      "created: 2026-08-04",
      "---",
      "",
      "Area description.",
      "",
    ].join("\n");
    const parseFrontmatter = createTrailFrontmatterParser(
      getFrontMatterInfo,
      parseFixtureYaml,
    );
    const source: TrailVaultSource<TrailReadableFile> = {
      getMarkdownFiles: () => [createFile(areaPath)],
      cachedRead: () => Promise.resolve(areaMarkdown),
      getFrontmatter: (_file, markdown) =>
        parseFrontmatter(markdown),
    };

    const result = await readTrailVault(source);

    expect(result.issues).toEqual([]);
    expect(result.areas).toEqual([
      expect.objectContaining({
        id: AREA_ID,
        description: "Area description.",
      }),
    ]);
  });
  it("returns no frontmatter when YAML parsing fails", () => {
    const parseFrontmatter = createTrailFrontmatterParser(
      () => ({
        exists: true,
        frontmatter: "invalid: [",
      }),
      () => {
        throw new Error("Invalid YAML.");
      },
    );

    expect(parseFrontmatter("ignored")).toBeUndefined();
  });
});
