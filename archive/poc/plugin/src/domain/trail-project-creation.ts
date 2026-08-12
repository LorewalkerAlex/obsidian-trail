import type {
  TrailArea,
  TrailProject,
} from "./trail-model";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INVALID_FILE_NAME_CHARACTERS =
  new Set('<>:"/\\|?*');
const WINDOWS_RESERVED_NAME_PATTERN =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const AREA_FILE_SUFFIX = "/Area.md";
const MAX_PROJECT_NAME_LENGTH = 120;

export type TrailProjectCreationErrorCode =
  | "area-path-invalid"
  | "project-created-invalid"
  | "project-id-invalid"
  | "project-name-invalid";

export class TrailProjectCreationError extends Error {
  constructor(
    readonly code: TrailProjectCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TrailProjectCreationError";
  }
}

export interface TrailPlannedProjectDraft {
  id: string;
  name: string;
  created: string;
  overview: string;
}

export function createPlannedProjectMarkdown(
  draft: TrailPlannedProjectDraft,
): string {
  validateProjectDraft(draft);

  return [
    "---",
    `id: ${JSON.stringify(draft.id)}`,
    `created: ${draft.created}`,
    "status: planned",
    "---",
    "",
    "## Overview",
    "",
    draft.overview.trim(),
    "",
    "## Tasks",
    "",
    "## Notes",
    "",
  ].join("\n");
}

export function projectPathForArea(
  area: TrailArea,
  projectName: string,
): string {
  validateProjectName(projectName);

  if (!area.filePath.endsWith(AREA_FILE_SUFFIX)) {
    throw new TrailProjectCreationError(
      "area-path-invalid",
      `Area file path must end with ${AREA_FILE_SUFFIX}: ${area.filePath}`,
    );
  }

  return `${area.filePath.slice(0, -AREA_FILE_SUFFIX.length)}/${projectName.trim()}.md`;
}

export function suggestTrailProjectName(
  noteText: string,
): string {
  const visibleText = noteText
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[_~`]/g, "")
    .split("")
    .map((character) =>
      isInvalidFileNameCharacter(character)
        ? " "
        : character)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .replace(/\.md$/i, "")
    .trim()
    .replace(/[. ]+$/g, "");

  const limitedName = visibleText
    .slice(0, MAX_PROJECT_NAME_LENGTH)
    .replace(/[. ]+$/g, "");

  if (
    limitedName === ""
    || limitedName === "."
    || limitedName === ".."
    || WINDOWS_RESERVED_NAME_PATTERN.test(limitedName)
  ) {
    return "Untitled Project";
  }

  return limitedName;
}

export function matchesPlannedProjectDraft(
  project: TrailProject,
  area: TrailArea,
  draft: TrailPlannedProjectDraft,
): boolean {
  return project.id === draft.id
    && project.areaId === area.id
    && project.areaName === area.name
    && project.name === draft.name.trim()
    && project.created === draft.created
    && project.status === "planned"
    && project.completedAt === undefined
    && project.overview === draft.overview.trim()
    && project.tasks.length === 0
    && project.notes.length === 0;
}

function hasInvalidFileNameCharacter(
  value: string,
): boolean {
  return value.split("").some(
    (character) => isInvalidFileNameCharacter(character),
  );
}

function isInvalidFileNameCharacter(
  character: string,
): boolean {
  const codePoint = character.charCodeAt(0);

  return codePoint <= 0x1f
    || INVALID_FILE_NAME_CHARACTERS.has(character);
}

function validateProjectDraft(
  draft: TrailPlannedProjectDraft,
): void {
  if (!UUID_PATTERN.test(draft.id)) {
    throw new TrailProjectCreationError(
      "project-id-invalid",
      "The new Project id must be a UUID.",
    );
  }

  if (!DATE_PATTERN.test(draft.created)) {
    throw new TrailProjectCreationError(
      "project-created-invalid",
      "The new Project created date must use YYYY-MM-DD.",
    );
  }

  validateProjectName(draft.name);
}

function validateProjectName(
  projectName: string,
): void {
  const trimmedName = projectName.trim();

  if (
    trimmedName === ""
    || trimmedName === "."
    || trimmedName === ".."
    || trimmedName.length > MAX_PROJECT_NAME_LENGTH
    || /\r|\n/.test(projectName)
    || hasInvalidFileNameCharacter(trimmedName)
    || /[.]$/.test(trimmedName)
    || WINDOWS_RESERVED_NAME_PATTERN.test(trimmedName)
    || /\.md$/i.test(trimmedName)
  ) {
    throw new TrailProjectCreationError(
      "project-name-invalid",
      "The Project name must be a valid single-line Windows file name without a .md suffix.",
    );
  }
}
