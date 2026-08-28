import type { TrailProject } from "../../domain/model/trail-entities";
import { resolveTrailDefaultStatusDefinition } from "../../domain/rules/trail-status-rules";
import { isTrailId } from "../../domain/validation/trail-value-validation";
import { serializeProjectMarkdown } from "../../markdown/codecs/trail-project-codec";
import {
  TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE,
  TRAIL_PROJECTS_PATH,
  createTrailSequencedEntityPath,
  readTrailEntityFileSequence,
} from "../../markdown/schema/trail-paths";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type {
  TrailPersistedPluginDataSnapshot,
  TrailPluginDataSnapshot,
} from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";

export class TrailDefaultProjectRecoveryError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TrailDefaultProjectRecoveryError";
  }
}

async function resolveReservedProject(input: {
  readonly createId: () => string;
  readonly domainSources: TrailDomainSourceRepository;
  readonly pluginData: TrailPersistedPluginDataSnapshot;
}): Promise<TrailProject> {
  const reserved = (await input.domainSources.list(TRAIL_PROJECTS_PATH)).filter((entry) => (
    entry.kind === "file"
    && readTrailEntityFileSequence(entry.name) === TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE
  ));
  if (reserved.length > 1) {
    throw new TrailDefaultProjectRecoveryError("Multiple Project carriers use reserved sequence 0000");
  }

  const existing = reserved[0];
  if (existing !== undefined) {
    const result = await input.domainSources.read("project", existing.path);
    if (result.kind !== "accepted" || result.issues.length > 0 || result.snapshot.kind !== "project") {
      throw new TrailDefaultProjectRecoveryError(
        `Reserved Project carrier is not a valid ordinary Project: ${existing.path}`,
      );
    }
    return result.snapshot.project;
  }

  const projectId = input.createId().trim();
  if (!isTrailId(projectId)) {
    throw new TrailDefaultProjectRecoveryError("Recovered Default Project ID must be non-empty text");
  }
  const project: TrailProject = {
    id: projectId,
    labelIds: [],
    statusDefinitionId: resolveTrailDefaultStatusDefinition(
      input.pluginData.configuration,
      "project",
      "unstarted",
    ).id,
    title: "Standalone",
  };
  const path = createTrailSequencedEntityPath(
    TRAIL_PROJECTS_PATH,
    TRAIL_FRESH_WORKSPACE_PROJECT_SEQUENCE,
    project.title,
    "Project",
  );
  const result = await input.domainSources.create(
    "project",
    path,
    serializeProjectMarkdown({ issues: [], milestones: [], project }),
  );
  if (
    result.kind !== "accepted"
    || result.issues.length > 0
    || result.snapshot.kind !== "project"
    || result.snapshot.project.id !== project.id
  ) {
    throw new TrailDefaultProjectRecoveryError(
      `Recovered Default Project failed authoritative verification: ${path}`,
    );
  }
  return result.snapshot.project;
}

/** Startup-only recovery for the one supported pre-ready gap: a physically missing Default reference. */
export async function recoverMissingTrailDefaultProject(input: {
  readonly createId: () => string;
  readonly domainSources: TrailDomainSourceRepository;
  readonly pluginData: TrailPluginDataRepository;
  readonly snapshot: TrailPersistedPluginDataSnapshot;
}): Promise<TrailPluginDataSnapshot> {
  if (input.snapshot.workspaceState.defaultProjectId !== undefined) {
    throw new TrailDefaultProjectRecoveryError(
      "Default Project recovery requires a physically missing defaultProjectId",
    );
  }
  try {
    const project = await resolveReservedProject({
      createId: input.createId,
      domainSources: input.domainSources,
      pluginData: input.snapshot,
    });
    return await input.pluginData.save({
      configuration: input.snapshot.configuration,
      workspaceState: {
        ...input.snapshot.workspaceState,
        defaultProjectId: project.id,
      },
    });
  } catch (error: unknown) {
    if (error instanceof TrailDefaultProjectRecoveryError) throw error;
    throw new TrailDefaultProjectRecoveryError("Default Project startup recovery failed", error);
  }
}
