import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import {
  appendWorkflowIssueToProjectMarkdown,
  deleteWorkflowIssueFromProjectMarkdown,
  parseProjectMarkdown,
  ProjectMarkdownMutationError,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
  type TrailProjectParseIssue,
  type TrailProjectParseResult,
} from "../../markdown/codecs/trail-project-codec";
import {
  isTrailProjectMarkdownPath,
  readTrailEntityFileSequence,
  TRAIL_PROJECTS_PATH,
} from "../../markdown/schema/trail-paths";
import type { TrailSourceEntry } from "../ports/trail-source-io";
import type { TrailDomainSourceRepository } from "./trail-domain-source-repository";
import type { TrailProjectSourceResult, TrailSourceProblem } from "./trail-source-result";
import {
  TrailWorkflowPersistenceError,
  type TrailWorkflowPersistence,
  type TrailWorkflowSnapshot,
} from "./trail-workflow-persistence";

type WorkflowPhysicalOperation =
  | "append-issue"
  | "delete-issue"
  | "update-issue";

function sourceProblem(issue: TrailProjectParseIssue): TrailSourceProblem {
  return {
    code: issue.code,
    filePath: issue.filePath,
    message: issue.message,
    objectId: issue.objectId,
    scope: issue.scope,
  };
}

function sourceResult(result: TrailProjectParseResult): TrailProjectSourceResult {
  return {
    contribution: result.contribution === undefined
      ? undefined
      : {
          filePath: result.contribution.filePath,
          issuesById: result.contribution.issuesById,
          project: result.contribution.project,
        },
    issues: result.issues.map(sourceProblem),
  };
}

function structuralIssue(
  filePath: string,
  code: string,
  message: string,
): TrailSourceProblem {
  return { code, filePath, message, scope: "file" };
}

function mapMarkdownMutationError(error: unknown): never {
  if (error instanceof ProjectMarkdownMutationError) {
    throw new TrailWorkflowPersistenceError(
      error.code,
      error.message,
      error,
    );
  }
  throw error;
}

export function createProjectSourcePersistence(
  repository: TrailDomainSourceRepository,
  parseYaml: TrailYamlParser,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): TrailWorkflowPersistence {
  const parse = (path: string, markdown: string): TrailProjectParseResult => {
    const result = parseProjectMarkdown({
      filePath: path,
      markdown,
      parseYaml,
    });
    const name = path.split("/").pop() ?? path;
    if (readTrailEntityFileSequence(name) !== undefined) {
      return result;
    }
    return {
      contribution: result.contribution,
      issues: [
        ...result.issues,
        {
          code: "workflow.projects.filename-invalid",
          filePath: path,
          message: "Project Markdown filename must use a four-digit sequence and readable suffix",
          scope: "file",
        },
      ],
      physicalMilestonesById: result.physicalMilestonesById,
    };
  };

  const processMutation = async (
    filePath: string,
    issueId: string,
    operation: WorkflowPhysicalOperation,
    transform: (latest: string) => string,
    correlationId?: string,
  ): Promise<TrailProjectSourceResult> => {
    if (!isTrailProjectMarkdownPath(filePath)) {
      throw new TrailWorkflowPersistenceError(
        "source-invalid",
        "Not a direct Trail Project source: " + filePath,
      );
    }
    diagnostics.record("persistence.workflow.process.started", {
      correlationId,
      data: { filePath, issueId, operation },
    });
    try {
      const result = await repository.process(filePath, transform, parse);
      diagnostics.record("persistence.workflow.process.completed", {
        correlationId,
        data: { filePath, issueId, operation },
      });
      diagnostics.record("persistence.workflow.verify-read.completed", {
        correlationId,
        data: {
          filePath,
          issueCount: Object.keys(result.contribution?.issuesById ?? {}).length,
          operation,
          parseIssueCount: result.issues.length,
        },
      });
      return sourceResult(result);
    } catch (error: unknown) {
      return mapMarkdownMutationError(error);
    }
  };

  return {
    appendIssue(filePath, expectedProject, issue, correlationId) {
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

    async createProjectAtPath(filePath, project, correlationId) {
      if (!isTrailProjectMarkdownPath(filePath)) {
        throw new TrailWorkflowPersistenceError(
          "source-invalid",
          "Not a direct Trail Project source: " + filePath,
        );
      }
      const name = filePath.split("/").pop() ?? filePath;
      if (readTrailEntityFileSequence(name) === undefined) {
        throw new TrailWorkflowPersistenceError(
          "source-invalid",
          "Project path must use a four-digit sequence: " + filePath,
        );
      }
      diagnostics.record("persistence.workflow.project-create.started", {
        correlationId,
        data: { filePath, projectId: project.id },
      });
      const result = await repository.create(
        filePath,
        serializeProjectMarkdown(project),
        parse,
      );
      diagnostics.record("persistence.workflow.project-create.completed", {
        correlationId,
        data: {
          filePath,
          parseIssueCount: result.issues.length,
          projectId: project.id,
        },
      });
      return sourceResult(result);
    },

    deleteIssue(filePath, expectedIssue, correlationId) {
      return processMutation(
        filePath,
        expectedIssue.id,
        "delete-issue",
        (latest) => deleteWorkflowIssueFromProjectMarkdown({
          expectedIssue,
          filePath,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },

    listProjectSources(): Promise<readonly TrailSourceEntry[]> {
      return repository.list(TRAIL_PROJECTS_PATH);
    },

    async readAll(): Promise<TrailWorkflowSnapshot> {
      const entries = await repository.list(TRAIL_PROJECTS_PATH);
      const projectPaths: string[] = [];
      const structuralIssues: TrailSourceProblem[] = [];

      for (const entry of entries) {
        if (entry.kind === "directory") {
          structuralIssues.push(structuralIssue(
            entry.path,
            "workflow.projects.child-directory",
            "Nested directories are not supported under Trail/Projects",
          ));
          continue;
        }
        if (!entry.name.endsWith(".md")) {
          structuralIssues.push(structuralIssue(
            entry.path,
            "workflow.projects.non-markdown",
            "Trail/Projects may only contain direct Project Markdown files",
          ));
          continue;
        }
        projectPaths.push(entry.path);
      }

      projectPaths.sort((left, right) => left.localeCompare(right));
      const projectResults: TrailProjectSourceResult[] = [];
      for (const filePath of projectPaths) {
        projectResults.push(sourceResult(await repository.read(filePath, parse)));
      }
      return { projectResults, structuralIssues };
    },

    async readSource(filePath): Promise<TrailProjectSourceResult> {
      if (!isTrailProjectMarkdownPath(filePath)) {
        throw new TrailWorkflowPersistenceError(
          "source-invalid",
          "Not a direct Trail Project source: " + filePath,
        );
      }
      return sourceResult(await repository.read(filePath, parse));
    },

    updateIssue(filePath, expectedIssue, issue, correlationId) {
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
