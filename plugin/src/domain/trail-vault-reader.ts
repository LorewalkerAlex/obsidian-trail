import type { App, TFile } from "obsidian";

import type {
  TrailArea,
  TrailFleetingNote,
  TrailParseIssue,
  TrailProject,
} from "./trail-model";
import { parseFleetingNotes } from "./trail-fleeting-note-parser";
import {
  parseArea,
  parseProject,
} from "./trail-parser";

const TRAIL_AREAS_ROOT = "Trail/Areas";
const TRAIL_FLEETING_NOTES_PATH = "Trail/Fleeting Notes.md";
const AREA_FILE_NAME = "Area.md";

export interface TrailReadableFile {
  path: string;
  basename: string;
}

export type TrailFrontmatterParser = (
  markdown: string,
) => Record<string, unknown> | undefined;

export interface TrailVaultSource<
  FileType extends TrailReadableFile,
> {
  getMarkdownFiles(): FileType[];
  cachedRead(file: FileType): Promise<string>;
  getFrontmatter(
    file: FileType,
    markdown: string,
  ): Record<string, unknown> | undefined;
}

export interface TrailVaultReadResult {
  areas: TrailArea[];
  projects: TrailProject[];
  fleetingNotes: TrailFleetingNote[];
  issues: TrailParseIssue[];
}

interface AreaFiles<
  FileType extends TrailReadableFile,
> {
  areaFile?: FileType;
  projectFiles: FileType[];
}

export function isTrailManagedMarkdownPath(
  filePath: string,
): boolean {
  const parts = filePath.split("/");

  return (
    parts.length === 4
    && parts[0] === "Trail"
    && parts[1] === "Areas"
    && parts[2] !== ""
    && parts[3]?.endsWith(".md") === true
  );
}

export function isTrailDataEventPath(
  filePath: string,
): boolean {
  if (
    filePath === "Trail"
    || filePath === TRAIL_AREAS_ROOT
    || filePath === TRAIL_FLEETING_NOTES_PATH
  ) {
    return true;
  }

  const parts = filePath.split("/");
  if (
    parts.length === 3
    && parts[0] === "Trail"
    && parts[1] === "Areas"
    && parts[2] !== ""
  ) {
    return true;
  }

  return isTrailManagedMarkdownPath(filePath);
}

export function createTrailFrontmatterParser(
  getFrontMatterInfo: (
    markdown: string,
  ) => {
    exists: boolean;
    frontmatter: string;
  },
  parseYaml: (yaml: string) => unknown,
): TrailFrontmatterParser {
  return (markdown) => {
    const frontmatterInfo = getFrontMatterInfo(markdown);

    if (!frontmatterInfo.exists) {
      return undefined;
    }

    try {
      return toRecord(
        parseYaml(frontmatterInfo.frontmatter),
      );
    } catch {
      return undefined;
    }
  };
}

export function createObsidianTrailSource(
  app: App,
  parseFrontmatter: TrailFrontmatterParser,
): TrailVaultSource<TFile> {
  return {
    getMarkdownFiles: () =>
      app.vault.getMarkdownFiles(),

    cachedRead: (file) =>
      app.vault.cachedRead(file),
    getFrontmatter: (_file, markdown) =>
      parseFrontmatter(markdown),
  };
}

export async function readTrailVault<
  FileType extends TrailReadableFile,
>(
  source: TrailVaultSource<FileType>,
): Promise<TrailVaultReadResult> {
  const issues: TrailParseIssue[] = [];
  const areas: TrailArea[] = [];
  const projects: TrailProject[] = [];
  const fleetingNotes: TrailFleetingNote[] = [];
  const markdownFiles = source.getMarkdownFiles();
  const areaFiles = groupAreaFiles(markdownFiles);
  const seenAreaIds = new Set<string>();
  const seenProjectIds = new Set<string>();
  const seenTaskIds = new Set<string>();

  for (
    const [areaName, files]
    of [...areaFiles.entries()].sort(
      ([left], [right]) =>
        left.localeCompare(right),
    )
  ) {
    if (!files.areaFile) {
      issues.push({
        scope: "file",
        code: "area.file.missing",
        message:
          `Area "${areaName}" does not contain Area.md.`,
        filePath:
          `${TRAIL_AREAS_ROOT}/${areaName}/${AREA_FILE_NAME}`,
      });
      continue;
    }

    const areaMarkdown = await readMarkdown(
      source,
      files.areaFile,
      issues,
    );

    if (areaMarkdown === undefined) {
      continue;
    }

    const areaResult = parseArea({
      areaName,
      filePath: files.areaFile.path,
      markdown: areaMarkdown,
      frontmatter:
        source.getFrontmatter(
          files.areaFile,
          areaMarkdown,
        ) ?? {},
    });

    issues.push(...areaResult.issues);

    if (!areaResult.value) {
      continue;
    }

    const area = areaResult.value;
    if (seenAreaIds.has(area.id)) {
      issues.push({
        scope: "file",
        code: "area.id.duplicate",
        message:
          `Area UUID "${area.id}" is already in use.`,
        filePath: area.filePath,
        objectId: area.id,
      });

      continue;
    }

    seenAreaIds.add(area.id);
    areas.push(area);

    for (
      const projectFile
      of [...files.projectFiles].sort(
        (left, right) =>
          left.path.localeCompare(right.path),
      )
    ) {
      const projectMarkdown = await readMarkdown(
        source,
        projectFile,
        issues,
      );

      if (projectMarkdown === undefined) {
        continue;
      }

      const projectResult = parseProject({
        area,
        projectName: projectFile.basename,
        filePath: projectFile.path,
        markdown: projectMarkdown,
        frontmatter:
          source.getFrontmatter(
            projectFile,
            projectMarkdown,
          ) ?? {},
      });

      issues.push(...projectResult.issues);

      if (!projectResult.value) {
        continue;
      }

      const project = projectResult.value;
      if (seenProjectIds.has(project.id)) {
        issues.push({
          scope: "file",
          code: "project.id.duplicate",
          message:
            `Project UUID "${project.id}" is already in use.`,
          filePath: project.filePath,
          objectId: project.id,
        });

        continue;
      }

      seenProjectIds.add(project.id);
      const tasks = project.tasks.filter((task) => {
        if (seenTaskIds.has(task.id)) {
          issues.push({
            scope: "task",
            code: "task.id.duplicate",
            message:
              `Task UUID "${task.id}" is already in use.`,
            filePath: project.filePath,
            objectId: task.id,
          });

          return false;
        }

        seenTaskIds.add(task.id);
        return true;
      });

      projects.push({
        ...project,
        tasks,
      });
    }
  }

  const fleetingNotesFile = markdownFiles.find(
    (file) => file.path === TRAIL_FLEETING_NOTES_PATH,
  );

  if (fleetingNotesFile) {
    const fleetingMarkdown = await readMarkdown(
      source,
      fleetingNotesFile,
      issues,
    );

    if (fleetingMarkdown !== undefined) {
      const fleetingResult = parseFleetingNotes({
        filePath: fleetingNotesFile.path,
        markdown: fleetingMarkdown,
      });

      fleetingNotes.push(...fleetingResult.notes);
      issues.push(...fleetingResult.issues);
    }
  }

  return {
    areas,
    projects,
    fleetingNotes,
    issues,
  };
}

async function readMarkdown<
  FileType extends TrailReadableFile,
>(
  source: TrailVaultSource<FileType>,
  file: FileType,
  issues: TrailParseIssue[],
): Promise<string | undefined> {
  try {
    return await source.cachedRead(file);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Unknown read error.";

    issues.push({
      scope: "file",
      code: "file.read.failed",
      message: `Trail could not read this file: ${message}`,
      filePath: file.path,
    });

    return undefined;
  }
}

function groupAreaFiles<
  FileType extends TrailReadableFile,
>(
  files: FileType[],
): Map<string, AreaFiles<FileType>> {
  const result =
    new Map<string, AreaFiles<FileType>>();

  for (const file of files) {
    const areaName = getAreaName(file.path);

    if (!areaName) {
      continue;
    }

    const grouped = result.get(areaName) ?? {
      projectFiles: [],
    };

    if (file.path.endsWith(`/${AREA_FILE_NAME}`)) {
      grouped.areaFile = file;
    } else {
      grouped.projectFiles.push(file);
    }

    result.set(areaName, grouped);
  }

  return result;
}

function getAreaName(
  filePath: string,
): string | undefined {
  if (!isTrailManagedMarkdownPath(filePath)) {
    return undefined;
  }

  return filePath.split("/")[2];
}

function toRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (
    typeof value !== "object"
    || value === null
    || Array.isArray(value)
  ) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
