import type { App } from "obsidian";

import type { TrailDiagnostics } from "../diagnostics/trail-diagnostics";
import { createObsidianSourceIO } from "../adapters/obsidian/trail-source-io-obsidian";
import type { TrailYamlParser } from "../markdown/codecs/trail-codec-support";
import { createTrailDomainSourceRepository } from "../persistence/domain-sources/trail-domain-source-repository";
import { createProjectSourcePersistence } from "../persistence/domain-sources/trail-project-source-persistence";
import type { TrailWorkflowIssueDeletionPersistence } from "./trail-workflow-issue-deletion-persistence";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";

/** Compatibility composition facade; physical ownership lives in SourceIO/Repository. */
export function createObsidianWorkflowPersistence(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics?: TrailDiagnostics,
): TrailWorkflowPersistence & TrailWorkflowIssueDeletionPersistence {
  return createProjectSourcePersistence(
    createTrailDomainSourceRepository(createObsidianSourceIO(app, fileKinds)),
    parseYaml,
    diagnostics,
  );
}
