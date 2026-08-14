import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailTriagePersistence } from "../../domain/trail-triage-persistence";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  updateTriageIssueInMarkdown,
  type TrailTriageParseResult,
} from "../../markdown/codecs/trail-triage-codec";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-physical-schema";
import type { TrailDomainSourceRepository } from "./trail-domain-source-repository";

type TriagePhysicalOperation = "append" | "delete" | "update";

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
  ): Promise<TrailTriageParseResult> => {
    diagnostics.record("persistence.triage.process.started", {
      correlationId,
      data: {
        issueId,
        operation,
        path: TRAIL_TRIAGE_PATH,
      },
    });
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
    return result;
  };

  return {
    appendIssue(
      issue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageParseResult> {
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
    ): Promise<TrailTriageParseResult> {
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

    readLatest(): Promise<TrailTriageParseResult> {
      return repository.read(TRAIL_TRIAGE_PATH, parse);
    },

    updateIssue(
      expectedIssue: TrailTriageIssue,
      issue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageParseResult> {
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
