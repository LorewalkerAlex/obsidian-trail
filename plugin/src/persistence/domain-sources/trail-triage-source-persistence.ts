import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  TriageMarkdownMutationError,
  updateTriageIssueInMarkdown,
  type TrailTriageParseIssue,
  type TrailTriageParseResult,
} from "../../markdown/codecs/trail-triage-codec";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository } from "./trail-domain-source-repository";
import type {
  TrailSourceProblem,
  TrailTriageSourceResult,
} from "./trail-source-result";
import {
  TrailTriagePersistenceError,
  type TrailTriagePersistence,
} from "./trail-triage-persistence";

type TriagePhysicalOperation = "append" | "delete" | "update";

function sourceProblem(issue: TrailTriageParseIssue): TrailSourceProblem {
  return {
    code: issue.code,
    filePath: issue.filePath,
    message: issue.message,
    objectId: issue.objectId,
    scope: issue.scope,
  };
}

function sourceResult(result: TrailTriageParseResult): TrailTriageSourceResult {
  return {
    contribution: {
      filePath: result.contribution.filePath,
      issuesById: result.contribution.issuesById,
    },
    issues: result.issues.map(sourceProblem),
  };
}

function mapMarkdownMutationError(error: unknown): never {
  if (error instanceof TriageMarkdownMutationError) {
    throw new TrailTriagePersistenceError(
      error.code,
      error.message,
      error,
    );
  }
  throw error;
}

export function createTriageSourcePersistence(
  repository: TrailDomainSourceRepository,
  parseYaml: TrailYamlParser,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): TrailTriagePersistence {
  const parse = (path: string, markdown: string): TrailTriageParseResult =>
    parseTriageMarkdown({ filePath: path, markdown, parseYaml });

  const processMutation = async (
    issueId: string,
    operation: TriagePhysicalOperation,
    transform: (latest: string) => string,
    correlationId?: string,
  ): Promise<TrailTriageSourceResult> => {
    diagnostics.record("persistence.triage.process.started", {
      correlationId,
      data: {
        issueId,
        operation,
        path: TRAIL_TRIAGE_PATH,
      },
    });
    try {
      const result = await repository.process(
        TRAIL_TRIAGE_PATH,
        transform,
        parse,
      );
      diagnostics.record("persistence.triage.process.completed", {
        correlationId,
        data: {
          issueId,
          operation,
          path: TRAIL_TRIAGE_PATH,
        },
      });
      diagnostics.record("persistence.triage.verify-read.completed", {
        correlationId,
        data: {
          operation,
          parseIssueCount: result.issues.length,
          recordCount: Object.keys(result.contribution.issuesById).length,
        },
      });
      return sourceResult(result);
    } catch (error: unknown) {
      return mapMarkdownMutationError(error);
    }
  };

  return {
    appendIssue(
      issue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageSourceResult> {
      return processMutation(
        issue.id,
        "append",
        (latest) => appendTriageIssueToMarkdown({
          filePath: TRAIL_TRIAGE_PATH,
          issue,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },

    deleteIssue(
      expectedIssue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageSourceResult> {
      return processMutation(
        expectedIssue.id,
        "delete",
        (latest) => deleteTriageIssueFromMarkdown({
          expectedIssue,
          filePath: TRAIL_TRIAGE_PATH,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },

    async readLatest(): Promise<TrailTriageSourceResult> {
      return sourceResult(await repository.read(TRAIL_TRIAGE_PATH, parse));
    },

    updateIssue(
      expectedIssue: TrailTriageIssue,
      issue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageSourceResult> {
      return processMutation(
        issue.id,
        "update",
        (latest) => updateTriageIssueInMarkdown({
          expectedIssue,
          filePath: TRAIL_TRIAGE_PATH,
          issue,
          markdown: latest,
          parseYaml,
        }),
        correlationId,
      );
    },
  };
}
