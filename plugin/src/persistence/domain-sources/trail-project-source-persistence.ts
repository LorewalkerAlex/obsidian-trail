import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailWorkflowIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import type { TrailSourceIssue } from "../../domain/trail-source-issue";
import type { TrailWorkflowIssueDeletionPersistence } from "../../domain/trail-workflow-issue-deletion-persistence";
import type {
  TrailWorkflowPersistence,
  TrailWorkflowSnapshot,
} from "../../domain/trail-workflow-persistence";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import {
  appendWorkflowIssueToProjectMarkdown,
  deleteWorkflowIssueFromProjectMarkdown,
  parseProjectMarkdown,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
  type TrailProjectParseResult,
} from "../../markdown/codecs/trail-project-codec";
import {
  readTrailEntityFileSequence,
  TRAIL_PROJECTS_PATH,
  isTrailProjectMarkdownPath,
} from "../../markdown/schema/trail-physical-schema";
import type { TrailSourceEntry } from "../ports/trail-source-io";
import type { TrailDomainSourceRepository } from "./trail-domain-source-repository";

type WorkflowPersistence = Omit<TrailWorkflowPersistence, "createProject">
  & TrailWorkflowIssueDeletionPersistence;

export interface TrailProjectSourcePhysicalPersistence {
  readonly createProjectAtPath: (
    filePath: string,
    project: TrailProject,
    correlationId?: string,
  ) => Promise<TrailProjectParseResult>;
  readonly listProjectSources: () => Promise<readonly TrailSourceEntry[]>;
}

type ProjectSourcePersistence = WorkflowPersistence & TrailProjectSourcePhysicalPersistence;

type WorkflowPhysicalOperation =
  | "append-issue"
  | "delete-issue"
  | "update-issue";

function structuralIssue(
  filePath: string,
  code: string,
  message: string,
): TrailSourceIssue {
  return { code, filePath, message, scope: "file" };
}

export function createProjectSourcePersistence(
  repository: TrailDomainSourceRepository,
  parseYaml: TrailYamlParser,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): ProjectSourcePersistence {
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
        structuralIssue(
          path,
          "workflow.projects.filename-invalid",
          "Project Markdown filename must use a four-digit sequence and readable suffix",
        ),
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
  ): Promise<TrailProjectParseResult> => {
    if (!isTrailProjectMarkdownPath(filePath)) {
      throw new Error(`Not a direct Formal Project Markdown path: ${filePath}`);
    }
    diagnostics.record("persistence.workflow.process.started", {
      correlationId,
      data: { filePath, issueId, operation },
    });
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
    return result;
  };

  return {
    appendIssue(
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

    async createProjectAtPath(
      filePath: string,
      project: TrailProject,
      correlationId?: string,
    ): Promise<TrailProjectParseResult> {
      if (!isTrailProjectMarkdownPath(filePath)) {
        throw new Error(`Not a direct Formal Project Markdown path: ${filePath}`);
      }
      const name = filePath.split("/").pop() ?? filePath;
      if (readTrailEntityFileSequence(name) === undefined) {
        throw new Error(`Project path must use a four-digit sequence: ${filePath}`);
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
      return result;
    },

    deleteIssue(
      filePath: string,
      expectedIssue: TrailWorkflowIssue,
      correlationId?: string,
    ): Promise<TrailProjectParseResult> {
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
      const structuralIssues: TrailSourceIssue[] = [];

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
      const projectResults: TrailProjectParseResult[] = [];
      for (const filePath of projectPaths) {
        projectResults.push(await repository.read(filePath, parse));
      }
      return { projectResults, structuralIssues };
    },

    readSource(filePath): Promise<TrailProjectParseResult> {
      if (!isTrailProjectMarkdownPath(filePath)) {
        return Promise.reject(
          new Error(`Not a direct Formal Project Markdown path: ${filePath}`),
        );
      }
      return repository.read(filePath, parse);
    },

    updateIssue(
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
