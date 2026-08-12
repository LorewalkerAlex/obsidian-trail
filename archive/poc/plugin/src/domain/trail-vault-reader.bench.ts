import { bench, describe, expect } from "vitest";

import {
  readTrailVault,
  type TrailReadableFile,
  type TrailVaultReadResult,
  type TrailVaultSource,
} from "./trail-vault-reader";

interface ScaleScenario {
  areaCount: number;
  projectsPerArea: number;
  tasksPerProject: number;
  unrelatedMarkdownCount: number;
}

interface ScaleCounts {
  areaCount: number;
  projectCount: number;
  taskCount: number;
  issueCount: number;
}

interface GeneratedScaleSource {
  source: TrailVaultSource<TrailReadableFile>;
  expected: ScaleCounts;
}

const NORMAL_SCALE: ScaleScenario = {
  areaCount: 20,
  projectsPerArea: 25,
  tasksPerProject: 20,
  unrelatedMarkdownCount: 5_000,
};

const STRESS_SCALE: ScaleScenario = {
  areaCount: 40,
  projectsPerArea: 25,
  tasksPerProject: 25,
  unrelatedMarkdownCount: 20_000,
};

const NORMAL_GENERATED = createScaleSource(NORMAL_SCALE);
const STRESS_GENERATED = createScaleSource(STRESS_SCALE);

describe("readTrailVault full read", () => {
  registerReadBenchmark(
    "normal: 20 Areas, 500 Projects, 10,000 Tasks",
    NORMAL_GENERATED,
  );
  registerReadBenchmark(
    "stress: 40 Areas, 1,000 Projects, 25,000 Tasks",
    STRESS_GENERATED,
  );
});

function registerReadBenchmark(
  name: string,
  generated: GeneratedScaleSource,
): void {
  let validated = false;

  bench(
    name,
    async () => {
      const observed = summarize(
        await readTrailVault(generated.source),
      );

      if (!validated) {
        expect(observed).toEqual(generated.expected);
        validated = true;
      }
    },
    {
      iterations: 5,
      time: 1_000,
    },
  );
}

function createScaleSource(
  scenario: ScaleScenario,
): GeneratedScaleSource {
  const files: TrailReadableFile[] = [];
  const markdownByPath = new Map<string, string>();
  const frontmatterByPath = new Map<
    string,
    Record<string, unknown>
  >();
  let idValue = 1;

  const createId = (): string => {
    const suffix = idValue.toString(16).padStart(12, "0");
    idValue += 1;

    return `00000000-0000-4000-8000-${suffix}`;
  };

  for (
    let areaIndex = 0;
    areaIndex < scenario.areaCount;
    areaIndex += 1
  ) {
    const areaName = `Area ${padIndex(areaIndex)}`;
    const areaPath = `Trail/Areas/${areaName}/Area.md`;
    const areaId = createId();

    files.push(createFile(areaPath));
    markdownByPath.set(
      areaPath,
      createAreaMarkdown(areaId, areaIndex),
    );
    frontmatterByPath.set(areaPath, {
      id: areaId,
      created: "2026-08-05",
    });

    for (
      let projectIndex = 0;
      projectIndex < scenario.projectsPerArea;
      projectIndex += 1
    ) {
      const projectName =
        `Project ${padIndex(projectIndex)}`;
      const projectPath =
        `Trail/Areas/${areaName}/${projectName}.md`;
      const projectId = createId();
      const taskIds = Array.from(
        { length: scenario.tasksPerProject },
        () => createId(),
      );

      files.push(createFile(projectPath));
      markdownByPath.set(
        projectPath,
        createProjectMarkdown({
          areaIndex,
          projectId,
          projectIndex,
          taskIds,
        }),
      );
      frontmatterByPath.set(projectPath, {
        id: projectId,
        created: "2026-08-05",
        status: "active",
      });
    }
  }

  for (
    let fileIndex = 0;
    fileIndex < scenario.unrelatedMarkdownCount;
    fileIndex += 1
  ) {
    files.push(
      createFile(
        `Notes/Reference ${padIndex(fileIndex)}.md`,
      ),
    );
  }

  files.reverse();

  return {
    source: {
      getMarkdownFiles: () => files,
      cachedRead: (file) => {
        const markdown = markdownByPath.get(file.path);

        if (markdown === undefined) {
          return Promise.reject(
            new Error(`Missing generated Markdown: ${file.path}`),
          );
        }

        return Promise.resolve(markdown);
      },
      getFrontmatter: (file) =>
        frontmatterByPath.get(file.path),
    },
    expected: {
      areaCount: scenario.areaCount,
      projectCount:
        scenario.areaCount * scenario.projectsPerArea,
      taskCount:
        scenario.areaCount
        * scenario.projectsPerArea
        * scenario.tasksPerProject,
      issueCount: 0,
    },
  };
}

function createFile(path: string): TrailReadableFile {
  const fileName = path.split("/").pop();

  if (!fileName) {
    throw new Error(`Invalid generated path: ${path}`);
  }

  return {
    path,
    basename: fileName.replace(/\.md$/, ""),
  };
}

function createAreaMarkdown(
  areaId: string,
  areaIndex: number,
): string {
  return [
    "---",
    `id: "${areaId}"`,
    "created: 2026-08-05",
    "---",
    "",
    `Generated Area ${areaIndex}.`,
    "",
  ].join("\n");
}

function createProjectMarkdown({
  areaIndex,
  projectId,
  projectIndex,
  taskIds,
}: {
  areaIndex: number;
  projectId: string;
  projectIndex: number;
  taskIds: string[];
}): string {
  const taskLines = taskIds.flatMap((taskId, taskIndex) => {
    const status = taskIndex % 2 === 0 ? "todo" : "doing";
    const priority = ["low", "medium", "high"][taskIndex % 3];
    const metadata = JSON.stringify({
      id: taskId,
      status,
      priority,
      created: "2026-08-05T09:00:00+08:00",
      due:
        taskIndex % 3 === 0
          ? "2026-08-31"
          : undefined,
      labels: ["generated", `area-${areaIndex}`],
    });

    return [
      `- [ ] Task ${taskIndex} <!-- trail:task ${metadata} -->`,
      `  - [ ] Subtask ${taskIndex}`,
      `  - Generated note ${projectIndex}-${taskIndex}.`,
    ];
  });

  return [
    "---",
    `id: "${projectId}"`,
    "created: 2026-08-05",
    "status: active",
    "---",
    "",
    "## Overview",
    "",
    `Generated Project ${areaIndex}-${projectIndex}.`,
    "",
    "## Tasks",
    "",
    ...taskLines,
    "",
    "## Notes",
    "",
    "- Generated benchmark note.",
    "",
  ].join("\n");
}

function summarize(
  result: TrailVaultReadResult,
): ScaleCounts {
  return {
    areaCount: result.areas.length,
    projectCount: result.projects.length,
    taskCount: result.projects.reduce(
      (total, project) => total + project.tasks.length,
      0,
    ),
    issueCount: result.issues.length,
  };
}

function padIndex(value: number): string {
  return value.toString().padStart(5, "0");
}
