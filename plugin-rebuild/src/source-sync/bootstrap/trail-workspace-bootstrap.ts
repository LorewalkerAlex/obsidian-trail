import {
  createDefaultTrailConfiguration,
  createDefaultTrailWorkspaceState,
} from "../../domain/rules/trail-default-configuration";
import { TRAIL_BOOTSTRAP_FILES } from "../../markdown/schema/trail-bootstrap-markdown";
import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_CYCLES_PATH,
  TRAIL_PROJECTLESS_ISSUES_PATH,
  TRAIL_TRIAGE_PATH,
} from "../../markdown/schema/trail-paths";
import type {
  TrailDomainSourceRepository,
  TrailManagedDomainSourceKind,
} from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO } from "../../persistence/ports/trail-workspace-layout-io";
import { discoverTrailWorkspace } from "../discovery/trail-workspace-discovery";

function singletonKind(path: string): TrailManagedDomainSourceKind {
  switch (path) {
    case TRAIL_TRIAGE_PATH:
      return "triage";
    case TRAIL_PROJECTLESS_ISSUES_PATH:
      return "projectless-issues";
    case TRAIL_CYCLES_PATH:
      return "cycles";
    default:
      throw new Error(`Bootstrap path is not a Domain singleton: ${path}`);
  }
}

export class TrailWorkspaceBootstrapError extends Error {
  public constructor(
    message: string,
    readonly rollbackIssues: readonly string[] = [],
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailWorkspaceBootstrapError";
  }
}

/** Explicitly creates only a genuinely Fresh workspace; existing gaps are never auto-healed. */
export async function bootstrapFreshTrailWorkspace(input: {
  readonly createId: () => string;
  readonly domainSources: TrailDomainSourceRepository;
  readonly layout: TrailWorkspaceLayoutIO;
  readonly pluginData: TrailPluginDataRepository;
  readonly timezone: string;
}): Promise<void> {
  const initial = await discoverTrailWorkspace(input);
  if (initial.mode !== "fresh") {
    throw new TrailWorkspaceBootstrapError(
      `Fresh bootstrap refused because workspace mode is ${initial.mode}`,
    );
  }

  const pluginData = {
    configuration: createDefaultTrailConfiguration({
      createId: input.createId,
      timezone: input.timezone,
    }),
    workspaceState: createDefaultTrailWorkspaceState(),
  };
  const createdDirectories: string[] = [];
  const attemptedFiles: Array<{ readonly content: string; readonly path: string }> = [];
  let pluginDataPersistenceStarted = false;

  try {
    for (const path of TRAIL_BOOTSTRAP_DIRECTORIES) {
      await input.layout.createDirectory(path);
      createdDirectories.push(path);
    }

    for (const file of TRAIL_BOOTSTRAP_FILES) {
      attemptedFiles.push(file);
      const result = await input.domainSources.create(
        singletonKind(file.path),
        file.path,
        file.content,
      );
      if (result.kind !== "accepted" || result.issues.length > 0) {
        throw new Error(`Bootstrap source failed authoritative verification: ${file.path}`);
      }
    }

    pluginDataPersistenceStarted = true;
    await input.pluginData.save(pluginData);

    const final = await discoverTrailWorkspace(input);
    if (final.mode !== "existing") {
      throw new Error(`Bootstrap finished in unexpected workspace mode: ${final.mode}`);
    }
  } catch (error: unknown) {
    if (pluginDataPersistenceStarted) {
      throw new TrailWorkspaceBootstrapError(
        "Fresh bootstrap failed after Plugin Data persistence began; verified Markdown was retained",
        [],
        error,
      );
    }

    const rollbackIssues: string[] = [];
    for (const file of [...attemptedFiles].reverse()) {
      try {
        if (await input.layout.pathKind(file.path) !== "file") continue;
        const deleted = await input.domainSources.deleteSourceIfUnchanged(
          file.path,
          file.content,
        );
        if (!deleted) {
          rollbackIssues.push(`Refused to delete changed bootstrap file: ${file.path}`);
        }
      } catch (rollbackError: unknown) {
        rollbackIssues.push(
          `Unable to rollback bootstrap file ${file.path}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    for (const path of [...createdDirectories].reverse()) {
      try {
        if (await input.layout.pathKind(path) !== "directory") continue;
        await input.layout.removeDirectoryIfEmpty(path);
      } catch (rollbackError: unknown) {
        rollbackIssues.push(
          `Unable to rollback bootstrap directory ${path}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    throw new TrailWorkspaceBootstrapError(
      "Fresh Trail workspace bootstrap failed before Plugin Data persistence",
      rollbackIssues,
      error,
    );
  }
}
