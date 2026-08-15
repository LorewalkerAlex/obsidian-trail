import type { App } from "obsidian";

import type { TrailDiagnostics } from "../../diagnostics/trail-diagnostics";
import type { TrailYamlParser } from "../../markdown/codecs/trail-codec-support";
import { createTrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import { createProjectSourcePersistence } from "../../persistence/domain-sources/trail-project-source-persistence";
import type { TrailWorkflowPersistence } from "../../persistence/domain-sources/trail-workflow-persistence";
import { createObsidianSourceIO } from "./trail-source-io-obsidian";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-bootstrap-obsidian";

/** Composes the complete Workflow persistence port from the Obsidian SourceIO adapter. */
export function createObsidianWorkflowPersistence(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics?: TrailDiagnostics,
): TrailWorkflowPersistence {
  return createProjectSourcePersistence(
    createTrailDomainSourceRepository(createObsidianSourceIO(app, fileKinds)),
    parseYaml,
    diagnostics,
  );
}
