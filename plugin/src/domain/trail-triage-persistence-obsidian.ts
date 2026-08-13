import type { App, TFile } from "obsidian";

import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";
import type { TrailTriageIssue } from "./trail-issue";
import { TRAIL_TRIAGE_PATH } from "./trail-physical-schema";
import type { TrailTriagePersistence } from "./trail-triage-persistence";
import {
  appendTriageIssueToMarkdown,
  deleteTriageIssueFromMarkdown,
  parseTriageMarkdown,
  updateTriageIssueInMarkdown,
  type TrailTriageParseResult,
  type TrailYamlParser,
} from "./trail-triage-markdown";

function requireTriageFile(
  app: Pick<App, "vault">,
  fileKinds: ObsidianWorkspaceFileKinds,
): TFile {
  const file = app.vault.getAbstractFileByPath(TRAIL_TRIAGE_PATH);
  if (!fileKinds.isFile(file)) {
    throw new Error(`Required Formal Triage file is missing: ${TRAIL_TRIAGE_PATH}`);
  }
  return file;
}

function parseLatest(
  markdown: string,
  parseYaml: TrailYamlParser,
): TrailTriageParseResult {
  return parseTriageMarkdown({
    filePath: TRAIL_TRIAGE_PATH,
    markdown,
    parseYaml,
  });
}

type TriagePhysicalOperation = "append" | "delete" | "update";

/**
 * Obsidian persistence adapter for the Formal Triage singleton. Every mutation
 * uses a synchronous pure Vault.process callback over the latest source, followed
 * by an authoritative read that verifies the persisted disk fact.
 */
export function createObsidianTriagePersistenceGateway(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): TrailTriagePersistence {
  const processMutation = async (
    issueId: string,
    operation: TriagePhysicalOperation,
    transform: (latest: string) => string,
    correlationId?: string,
  ): Promise<TrailTriageParseResult> => {
    const file = requireTriageFile(app, fileKinds);
    diagnostics.record("persistence.triage.process.started", {
      correlationId,
      data: {
        issueId,
        operation,
        path: TRAIL_TRIAGE_PATH,
      },
    });
    await app.vault.process(file, transform);
    diagnostics.record("persistence.triage.process.completed", {
      correlationId,
      data: {
        issueId,
        operation,
        path: TRAIL_TRIAGE_PATH,
      },
    });

    diagnostics.record("persistence.triage.verify-read.started", {
      correlationId,
      data: {
        operation,
        path: TRAIL_TRIAGE_PATH,
      },
    });
    const result = parseLatest(await app.vault.read(file), parseYaml);
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
    async appendIssue(
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

    async deleteIssue(
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

    async readLatest(): Promise<TrailTriageParseResult> {
      const file = requireTriageFile(app, fileKinds);
      return parseLatest(await app.vault.read(file), parseYaml);
    },

    async updateIssue(
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
