import type { App, TFile } from "obsidian";

import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";
import type { TrailTriageIssue } from "./trail-issue";
import { TRAIL_TRIAGE_PATH } from "./trail-physical-schema";
import type { TrailTriagePersistenceGateway } from "./trail-triage-intake";
import {
  appendTriageIssueToMarkdown,
  parseTriageMarkdown,
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

/**
 * Obsidian persistence adapter for the Formal Triage singleton. The process
 * callback is deliberately synchronous and pure: it receives the latest source,
 * validates/transforms it, and returns the complete replacement string.
 */
export function createObsidianTriagePersistenceGateway(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
): TrailTriagePersistenceGateway {
  return {
    async appendIssue(
      issue: TrailTriageIssue,
      correlationId?: string,
    ): Promise<TrailTriageParseResult> {
      const file = requireTriageFile(app, fileKinds);

      diagnostics.record("persistence.triage.process.started", {
        correlationId,
        data: {
          issueId: issue.id,
          path: TRAIL_TRIAGE_PATH,
        },
      });
      await app.vault.process(file, (latest: string) =>
        appendTriageIssueToMarkdown({
          filePath: TRAIL_TRIAGE_PATH,
          issue,
          markdown: latest,
          parseYaml,
        }));
      diagnostics.record("persistence.triage.process.completed", {
        correlationId,
        data: {
          issueId: issue.id,
          path: TRAIL_TRIAGE_PATH,
        },
      });

      // A post-write authoritative read verifies the disk fact rather than trusting
      // the in-memory transform result or an event notification.
      diagnostics.record("persistence.triage.verify-read.started", {
        correlationId,
        data: { path: TRAIL_TRIAGE_PATH },
      });
      const result = parseLatest(await app.vault.read(file), parseYaml);
      diagnostics.record("persistence.triage.verify-read.completed", {
        correlationId,
        data: {
          parseIssueCount: result.issues.length,
          recordCount: Object.keys(result.contribution.issuesById).length,
        },
      });
      return result;
    },

    async readLatest(): Promise<TrailTriageParseResult> {
      const file = requireTriageFile(app, fileKinds);
      return parseLatest(await app.vault.read(file), parseYaml);
    },
  };
}
