import type { App } from "obsidian";

import type { TrailDiagnostics } from "../diagnostics/trail-diagnostics";
import { createObsidianSourceIO } from "../adapters/obsidian/trail-source-io-obsidian";
import { createTrailDomainSourceRepository } from "../persistence/domain-sources/trail-domain-source-repository";
import { createTriageSourcePersistence } from "../persistence/domain-sources/trail-triage-source-persistence";
import type { TrailYamlParser } from "../markdown/codecs/trail-codec-support";
import type { TrailTriagePersistence } from "./trail-triage-persistence";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";

/** Compatibility composition facade; physical ownership lives in SourceIO/Repository. */
export function createObsidianTriagePersistenceGateway(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics?: TrailDiagnostics,
): TrailTriagePersistence {
  return createTriageSourcePersistence(
    createTrailDomainSourceRepository(createObsidianSourceIO(app, fileKinds)),
    parseYaml,
    diagnostics,
  );
}
