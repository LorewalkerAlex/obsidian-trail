import type {
  App,
  TFile,
} from "obsidian";

import type {
  TrailArea,
  TrailParseIssue,
  TrailProject,
} from "./trail-model";
import {
  createPlannedProjectMarkdown,
  matchesPlannedProjectDraft,
  projectPathForArea,
  type TrailPlannedProjectDraft,
  TrailProjectCreationError,
} from "./trail-project-creation";
import type {
  TrailMutableFile,
  TrailMutationSource,
} from "./trail-mutation-service";
import { parseProject } from "./trail-parser";
import type { TrailFrontmatterParser } from "./trail-vault-reader";

export interface TrailProjectCreationSource<
  FileType extends TrailMutableFile,
> extends TrailMutationSource<FileType> {
  getAbstractFileByPath(path: string): { path: string } | null;
  create(path: string, markdown: string): Promise<FileType>;
  read(file: FileType): Promise<string>;
  deleteFile(file: FileType): Promise<void>;
  getFrontmatter(
    markdown: string,
  ): Record<string, unknown> | undefined;
}

export interface TrailCreatedProject {
  project: TrailProject;
  fingerprint: string;
}

export type TrailProjectCreationMutationErrorCode =
  | "project-path-conflict"
  | "vault-create-failed"
  | "write-verification-failed"
  | "project-changed"
  | "vault-delete-failed";

export class TrailProjectCreationMutationError
  extends Error {
  constructor(
    readonly code:
      TrailProjectCreationMutationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailProjectCreationMutationError";
  }
}

export function createObsidianTrailProjectCreationSource(
  app: App,
  parseFrontmatter: TrailFrontmatterParser,
): TrailProjectCreationSource<TFile> {
  return {
    getFileByPath: (path) =>
      app.vault.getFileByPath(path),
    getAbstractFileByPath: (path) =>
      app.vault.getAbstractFileByPath(path),
    process: (file, update) =>
      app.vault.process(file, update),
    create: (path, markdown) =>
      app.vault.create(path, markdown),
    read: (file) =>
      app.vault.cachedRead(file),
    deleteFile: (file) =>
      app.fileManager.trashFile(file),
    getFrontmatter: (markdown) =>
      parseFrontmatter(markdown),
  };
}

export interface TrailCreateProjectMutationInput {
  area: TrailArea;
  project: TrailPlannedProjectDraft;
}

export async function createProjectInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailProjectCreationSource<FileType>,
  {
    area,
    project,
  }: TrailCreateProjectMutationInput,
): Promise<TrailCreatedProject> {
  const projectPath = projectPathForArea(
    area,
    project.name,
  );
  const expectedMarkdown =
    createPlannedProjectMarkdown(project);
  const existingFile = source.getFileByPath(projectPath);

  if (existingFile) {
    return confirmCreatedProject(
      source,
      existingFile,
      area,
      project,
      expectedMarkdown,
    );
  }

  if (source.getAbstractFileByPath(projectPath)) {
    throw projectPathConflict(projectPath);
  }

  let createdFile: FileType;

  try {
    createdFile = await source.create(
      projectPath,
      expectedMarkdown,
    );
  } catch (error: unknown) {
    const concurrentFile = source.getFileByPath(projectPath);

    if (concurrentFile) {
      return confirmCreatedProject(
        source,
        concurrentFile,
        area,
        project,
        expectedMarkdown,
      );
    }

    if (error instanceof TrailProjectCreationError) {
      throw error;
    }

    throw new TrailProjectCreationMutationError(
      "vault-create-failed",
      `Trail could not create Project file ${projectPath}.`,
      error,
    );
  }

  return confirmCreatedProject(
    source,
    createdFile,
    area,
    project,
    expectedMarkdown,
  );
}

export interface TrailRemoveCreatedProjectMutationInput {
  expectedProject: TrailCreatedProject;
}

export async function removeCreatedProjectInVault<
  FileType extends TrailMutableFile,
>(
  source: TrailProjectCreationSource<FileType>,
  {
    expectedProject,
  }: TrailRemoveCreatedProjectMutationInput,
): Promise<void> {
  const projectPath = expectedProject.project.filePath;
  const file = source.getFileByPath(projectPath);

  if (!file) {
    if (source.getAbstractFileByPath(projectPath)) {
      throw new TrailProjectCreationMutationError(
        "project-changed",
        `The created Project path is no longer a file: ${projectPath}`,
      );
    }

    return;
  }

  const currentMarkdown = await readProjectMarkdown(
    source,
    file,
    projectPath,
  );

  if (currentMarkdown !== expectedProject.fingerprint) {
    throw new TrailProjectCreationMutationError(
      "project-changed",
      "The created Project changed before it could be compensated.",
    );
  }

  try {
    await source.deleteFile(file);
  } catch (error: unknown) {
    throw new TrailProjectCreationMutationError(
      "vault-delete-failed",
      `Trail could not compensate created Project ${projectPath}.`,
      error,
    );
  }

  if (source.getAbstractFileByPath(projectPath)) {
    throw new TrailProjectCreationMutationError(
      "write-verification-failed",
      `Trail could not confirm compensation of Project ${projectPath}.`,
    );
  }
}

async function confirmCreatedProject<
  FileType extends TrailMutableFile,
>(
  source: TrailProjectCreationSource<FileType>,
  file: FileType,
  area: TrailArea,
  draft: TrailPlannedProjectDraft,
  expectedMarkdown: string,
): Promise<TrailCreatedProject> {
  const projectPath = projectPathForArea(area, draft.name);

  if (file.path !== projectPath) {
    throw new TrailProjectCreationMutationError(
      "write-verification-failed",
      `Trail created the Project at an unexpected path: ${file.path}`,
    );
  }

  const writtenMarkdown = await readProjectMarkdown(
    source,
    file,
    projectPath,
  );

  if (writtenMarkdown !== expectedMarkdown) {
    throw projectPathConflict(projectPath);
  }

  const result = parseProject({
    area,
    projectName: draft.name.trim(),
    filePath: projectPath,
    markdown: writtenMarkdown,
    frontmatter:
      source.getFrontmatter(writtenMarkdown) ?? {},
  });
  const issue = relevantIssue(result.issues, draft.id);

  if (
    issue
    || !result.value
    || !matchesPlannedProjectDraft(
      result.value,
      area,
      draft,
    )
  ) {
    throw new TrailProjectCreationMutationError(
      "write-verification-failed",
      issue?.message
        ?? `Trail could not confirm created Project UUID "${draft.id}" after writing.`,
    );
  }

  return {
    project: result.value,
    fingerprint: writtenMarkdown,
  };
}

async function readProjectMarkdown<
  FileType extends TrailMutableFile,
>(
  source: TrailProjectCreationSource<FileType>,
  file: FileType,
  projectPath: string,
): Promise<string> {
  try {
    return await source.read(file);
  } catch (error: unknown) {
    throw new TrailProjectCreationMutationError(
      "write-verification-failed",
      `Trail could not read created Project ${projectPath}.`,
      error,
    );
  }
}

function projectPathConflict(
  projectPath: string,
): TrailProjectCreationMutationError {
  return new TrailProjectCreationMutationError(
    "project-path-conflict",
    `A different file or folder already exists at ${projectPath}.`,
  );
}

function relevantIssue(
  issues: TrailParseIssue[],
  projectId: string,
): TrailParseIssue | undefined {
  return issues.find(
    (candidate) =>
      candidate.scope === "file"
      || candidate.objectId === projectId,
  );
}
