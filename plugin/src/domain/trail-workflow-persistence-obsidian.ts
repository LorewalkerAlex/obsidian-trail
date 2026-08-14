import type { App } from "obsidian";

import type { TrailDiagnostics } from "../diagnostics/trail-diagnostics";
import { createObsidianSourceIO } from "../adapters/obsidian/trail-source-io-obsidian";
import type { TrailYamlParser } from "../markdown/codecs/trail-codec-support";
import { createTrailProjectPathAllocator } from "../mutation/physical/trail-file-backed-entity-path-allocator";
import { createTrailDomainSourceRepository } from "../persistence/domain-sources/trail-domain-source-repository";
import {
  createProjectSourcePersistence,
  type TrailProjectSourcePhysicalPersistence,
} from "../persistence/domain-sources/trail-project-source-persistence";
import type { TrailWorkflowIssueDeletionPersistence } from "./trail-workflow-issue-deletion-persistence";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import type { ObsidianWorkspaceFileKinds } from "./trail-workspace-obsidian";

type ObsidianWorkflowPersistence = TrailWorkflowPersistence
  & TrailWorkflowIssueDeletionPersistence
  & TrailProjectSourcePhysicalPersistence;

/**
 * Compatibility composition facade. Project path allocation is owned by the
 * mutation physical layer; canonical persistence only creates at an explicit path.
 */
export function createObsidianWorkflowPersistence(
  app: Pick<App, "vault">,
  parseYaml: TrailYamlParser,
  fileKinds: ObsidianWorkspaceFileKinds,
  diagnostics?: TrailDiagnostics,
): ObsidianWorkflowPersistence {
  const sourcePersistence = createProjectSourcePersistence(
    createTrailDomainSourceRepository(createObsidianSourceIO(app, fileKinds)),
    parseYaml,
    diagnostics,
  );
  const allocateProjectPath = createTrailProjectPathAllocator(
    sourcePersistence.listProjectSources,
  );

  return {
    ...sourcePersistence,
    async createProject(project, correlationId) {
      const filePath = await allocateProjectPath(project);
      return sourcePersistence.createProjectAtPath(
        filePath,
        project,
        correlationId,
      );
    },
  };
}
