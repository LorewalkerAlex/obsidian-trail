import { describe, expect, it } from "vitest";

import type {
  TrailArea,
  TrailParseResult,
  TrailProject,
} from "./trail-model";
import { parseArea, parseProject } from "./trail-parser";

const AREA_PATH = "Trail/Areas/Work/Area.md";
const PROJECT_PATH = "Trail/Areas/Work/Trail POC.md";

const AREA_ID = "df4ec59e-bfe4-4a09-a079-43ff9350642d";
const PROJECT_ID = "9e600f80-6b24-4738-b5cf-ef9f6f2974b6";
const PARSER_TASK_ID = "fa3b3a46-f818-416a-9dd0-59aa168bc467";
const READER_TASK_ID = "8c774a86-54aa-48d3-9010-99372d0738fc";
const COMPLETED_TASK_ID = "991db9cf-a1c0-4346-9537-01c284ee9767";

const areaMarkdown = [
  "---",
  'id: "df4ec59e-bfe4-4a09-a079-43ff9350642d"',
  "created: 2026-08-04",
  "---",
  "",
  "用于验证 Trail Markdown 数据读取链路的工作 Area。",
  "",
].join("\n");

const projectMarkdown = [
  "---",
  'id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6"',
  "created: 2026-08-04",
  "status: active",
  "---",
  "",
  "## Overview",
  "",
  "验证 Trail 能够从真实 Obsidian Vault 读取并解析 Area、Project 和 Task。",
  "",
  "## Tasks",
  "",
  '- [ ] 完成 **Markdown** Parser [[Trail]] `POC` <!-- trail:task {"id":"fa3b3a46-f818-416a-9dd0-59aa168bc467","status":"doing","priority":"high","created":"2026-08-04T10:00:00+08:00","due":"2026-08-10","labels":["type:spike","layer:data"]} -->',
  "  - [x] 定义最小 Fixture",
  "  - [ ] 验证异常隔离",
  "  - MetadataCache 更新后重新读取对应文件。",
  '- [ ] 接入 Obsidian Vault Reader <!-- trail:task {"id":"8c774a86-54aa-48d3-9010-99372d0738fc","status":"todo","priority":"medium","created":"2026-08-04T10:05:00+08:00","labels":["layer:integration"]} -->',
  '- [x] 初始化 Plugin Shell <!-- trail:task {"id":"991db9cf-a1c0-4346-9537-01c284ee9767","status":"completed","priority":"low","created":"2026-08-03T09:00:00+08:00","completed":"2026-08-03T18:00:00+08:00","labels":[]} -->',
  "",
  "## Notes",
  "",
  "- Fixture 会同时覆盖中文、粗体、wikilink 和行内代码。",
  "- 本阶段只验证读取，不修改 Markdown。",
  "",
].join("\n");

function parseFixtureArea(): TrailArea {
  const result = parseArea({
    areaName: "Work",
    filePath: AREA_PATH,
    markdown: areaMarkdown,
    frontmatter: {
      id: AREA_ID,
      created: "2026-08-04",
    },
  });

  expect(result.issues).toEqual([]);
  return requireValue(result);
}

function parseFixtureProject(
  markdown = projectMarkdown,
): TrailParseResult<TrailProject> {
  return parseProject({
    area: parseFixtureArea(),
    projectName: "Trail POC",
    filePath: PROJECT_PATH,
    markdown,
    frontmatter: {
      id: PROJECT_ID,
      created: "2026-08-04",
      status: "active",
    },
  });
}

function requireValue<T>(result: TrailParseResult<T>): T {
  if (!result.value) {
    throw new Error("Expected a parsed value.");
  }

  return result.value;
}

describe("Trail Markdown parser", () => {
  it("parses the current Area and Project fixtures", () => {
    const result = parseFixtureProject();

    expect(result.issues).toEqual([]);
    const project = requireValue(result);

    expect(project).toMatchObject({
      id: PROJECT_ID,
      areaId: AREA_ID,
      areaName: "Work",
      name: "Trail POC",
      status: "active",
    });

    expect(project.overview).toContain("真实 Obsidian Vault");
    expect(project.tasks).toHaveLength(3);
    expect(project.notes).toEqual([
      {
        text: "Fixture 会同时覆盖中文、粗体、wikilink 和行内代码。",
      },
      {
        text: "本阶段只验证读取，不修改 Markdown。",
      },
    ]);

    expect(project.tasks[0]).toMatchObject({
      id: PARSER_TASK_ID,
      title: "完成 **Markdown** Parser [[Trail]] `POC`",
      status: "doing",
      priority: "high",
      due: "2026-08-10",
      labels: ["type:spike", "layer:data"],
      subtasks: [
        {
          text: "定义最小 Fixture",
          completed: true,
        },
        {
          text: "验证异常隔离",
          completed: false,
        },
      ],
      notes: [
        {
          text: "MetadataCache 更新后重新读取对应文件。",
        },
      ],
    });

    expect(project.tasks[1].id).toBe(READER_TASK_ID);
    expect(project.tasks[2]).toMatchObject({
      id: COMPLETED_TASK_ID,
      status: "completed",
      completed: "2026-08-03T18:00:00+08:00",
    });

    const source = project.tasks[0].source;

    expect(source.startOffset).toBeLessThan(source.endOffset);
    expect(
      projectMarkdown.slice(source.startOffset, source.endOffset),
    ).toContain("完成 **Markdown** Parser");
  });

  it("keeps valid tasks when one task has invalid metadata", () => {
    const result = parseFixtureProject(
      projectMarkdown.replace(READER_TASK_ID, "not-a-uuid"),
    );

    const project = requireValue(result);

    expect(project.tasks).toHaveLength(2);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "task",
        code: "task.metadata.invalid",
      }),
    );
  });

  it("reports and omits duplicate task ids", () => {
    const result = parseFixtureProject(
      projectMarkdown.replace(READER_TASK_ID, PARSER_TASK_ID),
    );

    const project = requireValue(result);

    expect(project.tasks).toHaveLength(2);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "task",
        code: "task.id.duplicate",
        objectId: PARSER_TASK_ID,
      }),
    );
  });

  it("rejects missing or out-of-order fixed sections", () => {
    const result = parseFixtureProject(
      projectMarkdown.replace("## Tasks", "## Notes"),
    );

    expect(result.value).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "file",
        code: "project.sections.invalid",
      }),
    );
  });

  it("rejects additional level-two sections", () => {
    const result = parseFixtureProject(
      projectMarkdown.replace(
        "## Tasks",
        "## Other\n\nUnexpected content.\n\n## Tasks",
      ),
    );

    expect(result.value).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "file",
        code: "project.sections.invalid",
      }),
    );
  });

  it("isolates checkbox and completion metadata mismatches", () => {
    const result = parseFixtureProject(
      projectMarkdown.replace(
        "- [x] 初始化 Plugin Shell",
        "- [ ] 初始化 Plugin Shell",
      ),
    );

    const project = requireValue(result);

    expect(project.tasks).toHaveLength(2);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "task",
        code: "task.completion.invalid",
        objectId: COMPLETED_TASK_ID,
      }),
    );
  });

  it("rejects an Area with invalid required frontmatter", () => {
    const result = parseArea({
      areaName: "Work",
      filePath: AREA_PATH,
      markdown: areaMarkdown,
      frontmatter: {
        id: "not-a-uuid",
        created: "2026-08-04",
      },
    });

    expect(result.value).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        scope: "file",
        code: "id.invalid",
      }),
    );
  });
});
