import type { App, TFile, TFolder } from "obsidian";

import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import type { TrailWorkflowIssue } from "./trail-issue";
import {
  TRAIL_PROJECTS_PATH,
  isTrailProjectMarkdownPath,
} from "./trail-physical-schema";
import type { TrailProject } from "./trail-project";
import {
  appendWorkflowIssueToProjectMarkdown,
  parseProjectMarkdown,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
  type TrailProjectParseResult,
} from "./trail-project-markdown";
import type { TrailSourceIssue } from "./trail-source-issue";
import type { TrailYamlParser } from "./trail-triage-markdown";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";

const PROJECT_FILENAME = /^(\d{4}) (.+)\.md$/;

function requireProjectsFolder(
  app: Pick<App, "vault">,
  fileKinds: ObsidianWorkspaceFileKinds,
): TFolder {
  const folder = app.vault.getAbstractFileByPath(TRAIL_PROJECTS_PATH);
  if (!fileKinds.isFolder(folder)) {
    throw new Error(`Required Formal Projects directory is missing: ${TRAIL_PROJECTS_PATH}`);
  }
  return folder;
}

function requireProjectFile(
  app: Pick<App, "vault">,
  fileKinds: ObsidianWorkspaceFileKinds,
  filePath: string,
): TFile {
  if (!isTrailProjectMarkdownPath(filePath)) {
    throw new Error(`Not a direct Formal Project Markdown path: ${filePath}`);
  }
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!fileKinds.isFile(file)) {
    throw new Error(`Formal Project file is missing: ${filePath}`);
  }
  return file;
}

function sanitizeFilenameSuffix(title: string): string {
  const sanitized = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return sanitized === "" ? "Project" : sanitized;
}

function structuralIssue(
  filePath: string,
  code: string,
  message: string,
): TrailSourceIssue {
  return {
    code,
    filePath,
    message,
    scope: "file",
  };
}

/** Obsidian adapter for Project-file discovery and guarded Workflow mutations. */
export function createObsidianWorkflowPersistence(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): TrailWorkflowPersistence {
  const parseFile = async (file: TFile): Promise<TrailProjectParseResult> => {
    const result = parseProjectMarkdown({
      filePath: file.path,
      markdown: await app.vault.read(file),
      parseYaml,
    });
    if (PROJECT_FILENAME.exec(file.name) !== null) {
      return result;
    }
    return {
      contribution: result.contribution,
      issues: [
        ...result.issues,
        structuralIssue(
          file.path,
          "workflow.projects.filename-invalid",
          "Project Markdown filename must use a four-digit sequence and readable suffix",
        ),
      ],
    };
  };

  const processMutation = async (
    filePath: string,
    issueId: string,
    operation: "append-issue" | "update-issue",
    transform: (latest: string) => string,
    correlationId?: string,
  ): Promise<TrailProjectParseResult> => {
    const file = requireProjectFile(app, fileKinds, filePath);
    diagnostics.record("persistence.workflow.process.started", {
      correlationId,
      data: { filePath, issueId, operation },
    });
    await app.vault.process(file, transform);
    diagnostics.record("persistence.workflow.process.completed", {
      correlationId,
      data: { filePath, issueId, operation },
    });
    const result = await parseFile(file);
    diagnostics.record("persistence.workflow.verify-read.completed", {
      correlationId,
      data: {
        filePath,
        issueCount: Object.keys(result.contribution?.issuesById ?? {}).length,
        operation,
        parseIssueCount: result.issues.length,
      },
    });
    return result;
  };

  return {
    async appendIssue(
      filePath,
      expectedProject,
      issue,
      correlationId,
    ): Promise<TrailProjectParseResult> {
      return processMutation(
        filePath,
        issue.id,
        "append-issue",
        (latest) => appendWorkflowIssueToProjectMarkdown({
          expectedProject,
          filePath,
          issue,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },

    async createProject(
      project: TrailProject,
      correlationId?: string,
    ): Promise<TrailProjectParseResult> {
      const folder = requireProjectsFolder(app, fileKinds);
      let maxSequence = 0;
      for (const child of folder.children) {
        if (!fileKinds.isFile(child)) continue;
        const match = PROJECT_FILENAME.exec(child.name);
        if (match !== null) {
          maxSequence = Math.max(maxSequence, Number(match[1]));
        }
      }
      const nextSequence = maxSequence + 1;
      if (nextSequence > 9999) {
        throw new Error("Project physical sequence exhausted the four-digit namespace");
      }
      const suffix = sanitizeFilenameSuffix(project.title);
      const filePath = `${TRAIL_PROJECTS_PATH}/${String(nextSequence).padStart(4, "0")} ${suffix}.md`;
      diagnostics.record("persistence.workflow.project-create.started", {
        correlationId,
        data: { filePath, projectId: project.id },
      });
      const file = await app.vault.create(filePath, serializeProjectMarkdown(project));
      const result = await parseFile(file);
      diagnostics.record("persistence.workflow.project-create.completed", {
        correlationId,
        data: {
          filePath,
          parseIssueCount: result.issues.length,
          projectId: project.id,
        },
      });
      return result;
    },

    async readAll() {
      const folder = requireProjectsFolder(app, fileKinds);
      const projectFiles: TFile[] = [];
      const structuralIssues: TrailSourceIssue[] = [];

      for (const child of folder.children) {
        if (fileKinds.isFolder(child)) {
          structuralIssues.push(structuralIssue(
            child.path,
            "workflow.projects.child-directory",
            "Nested directories are not supported under Trail/Projects",
          ));
          continue;
        }
        if (!fileKinds.isFile(child)) continue;
        if (!child.name.endsWith(".md")) {
          structuralIssues.push(structuralIssue(
            child.path,
            "workflow.projects.non-markdown",
            "Trail/Projects may only contain direct Project Markdown files",
          ));
          continue;
        }
        projectFiles.push(child);
      }

      projectFiles.sort((left, right) => left.path.localeCompare(right.path));
      const projectResults: TrailProjectParseResult[] = [];
      for (const file of projectFiles) projectResults.push(await parseFile(file));
      return { projectResults, structuralIssues };
    },

    async readSource(filePath): Promise<TrailProjectParseResult> {
      return parseFile(requireProjectFile(app, fileKinds, filePath));
    },

    async updateIssue(
      filePath: string,
      expectedIssue: TrailWorkflowIssue,
      issue: TrailWorkflowIssue,
      correlationId?: string,
    ): Promise<TrailProjectParseResult> {
      return processMutation(
        filePath,
        issue.id,
        "update-issue",
        (latest) => updateWorkflowIssueInProjectMarkdown({
          expectedIssue,
          filePath,
          issue,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },
  };
}
