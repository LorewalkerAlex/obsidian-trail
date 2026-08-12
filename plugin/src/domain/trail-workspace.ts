import {
  createDefaultTrailPluginData,
  type TrailPluginData,
  validateTrailPluginData,
} from "./trail-configuration";
import {
  TRAIL_BOOTSTRAP_DIRECTORIES,
  TRAIL_BOOTSTRAP_FILES,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TOP_LEVEL_DIRECTORIES,
} from "./trail-physical-schema";

export interface ManagedRootEntry {
  readonly kind: "directory" | "file";
  readonly name: string;
}

export interface ManagedMarkdownProbe {
  readonly existingPaths: readonly string[];
  readonly invalidFormalPaths?: readonly string[];
  readonly rootKind?: "directory" | "file";
  readonly topLevelEntries: readonly ManagedRootEntry[];
  readonly trailExists: boolean;
}

export interface PluginDataProbe {
  readonly exists: boolean;
  readonly value?: unknown;
}

export interface WorkspaceProbe {
  readonly markdown: ManagedMarkdownProbe;
  readonly pluginData: PluginDataProbe;
}

export type ManagedMarkdownClassification =
  | {
      readonly kind: "absent";
    }
  | {
      readonly kind: "formal-valid";
    }
  | {
      readonly kind: "formal-incomplete";
      readonly missingPaths: readonly string[];
    }
  | {
      readonly invalidPaths: readonly string[];
      readonly kind: "formal-invalid";
    }
  | {
      readonly conflicts: readonly string[];
      readonly kind: "managed-root-conflict";
    };

export type PluginDataClassification =
  | {
      readonly kind: "absent";
    }
  | {
      readonly data: TrailPluginData;
      readonly kind: "valid";
    }
  | {
      readonly issues: readonly string[];
      readonly kind: "invalid";
    };

export type WorkspaceBlocker =
  | "configuration-missing"
  | "formal-markdown-incomplete"
  | "formal-markdown-invalid"
  | "invalid-configuration"
  | "managed-markdown-missing"
  | "managed-root-conflict";

export interface WorkspaceClassification {
  readonly blockers: readonly WorkspaceBlocker[];
  readonly canBootstrap: boolean;
  readonly canLoad: boolean;
  readonly markdown: ManagedMarkdownClassification;
  readonly mode: "blocked" | "existing" | "fresh";
  readonly pluginData: PluginDataClassification;
}

export interface FreshWorkspaceBootstrapPlan {
  readonly directories: readonly string[];
  readonly files: readonly {
    readonly content: string;
    readonly path: string;
  }[];
  readonly pluginData: TrailPluginData;
}

export interface FreshWorkspaceBootstrapOptions {
  readonly createId: () => string;
  readonly timezone: string;
}

export interface WorkspaceBootstrapGateway {
  readonly createDirectory: (path: string) => Promise<void>;
  readonly createFile: (path: string, content: string) => Promise<void>;
  readonly deleteFile: (path: string) => Promise<void>;
  readonly loadPluginData: () => Promise<PluginDataProbe>;
  readonly probeWorkspace: () => Promise<WorkspaceProbe>;
  readonly readFile: (path: string) => Promise<string>;
  readonly removeDirectoryIfEmpty: (path: string) => Promise<void>;
  readonly savePluginData: (data: TrailPluginData) => Promise<void>;
}

export class WorkspaceBootstrapError extends Error {
  public readonly rollbackIssues: readonly string[];

  public constructor(message: string, rollbackIssues: readonly string[] = []) {
    super(message);
    this.name = "WorkspaceBootstrapError";
    this.rollbackIssues = rollbackIssues;
  }
}

/**
 * Implements the conservative two-footprint safety policy derived from the
 * canonical contracts. It is an implementation classification, not canonical
 * persisted Domain state.
 */
export function classifyManagedMarkdown(
  probe: ManagedMarkdownProbe,
): ManagedMarkdownClassification {
  if (!probe.trailExists) {
    return { kind: "absent" };
  }

  if (probe.rootKind === "file") {
    return {
      kind: "managed-root-conflict",
      conflicts: ["Trail (expected directory)"],
    };
  }

  const expectedTopLevel = new Set<string>(TRAIL_TOP_LEVEL_DIRECTORIES);
  const conflicts = probe.topLevelEntries
    .filter(
      (entry) =>
        entry.kind !== "directory" || !expectedTopLevel.has(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  if (conflicts.length > 0) {
    return { kind: "managed-root-conflict", conflicts };
  }

  const existingPaths = new Set(probe.existingPaths);
  const requiredDirectoryPaths = TRAIL_TOP_LEVEL_DIRECTORIES.map(
    (name) => `Trail/${name}`,
  );
  const missingPaths = [
    ...requiredDirectoryPaths,
    ...TRAIL_REQUIRED_SINGLETON_PATHS,
  ].filter((path) => !existingPaths.has(path));

  if (missingPaths.length > 0) {
    return {
      kind: "formal-incomplete",
      missingPaths,
    };
  }

  const invalidPaths = [...(probe.invalidFormalPaths ?? [])].sort();
  if (invalidPaths.length > 0) {
    return {
      kind: "formal-invalid",
      invalidPaths,
    };
  }

  return { kind: "formal-valid" };
}

export function classifyPluginData(
  probe: PluginDataProbe,
): PluginDataClassification {
  if (!probe.exists) {
    return { kind: "absent" };
  }

  const validation = validateTrailPluginData(probe.value);
  if (!validation.ok) {
    return {
      kind: "invalid",
      issues: validation.issues,
    };
  }

  return {
    kind: "valid",
    data: validation.value,
  };
}

export function classifyWorkspace(
  probe: WorkspaceProbe,
): WorkspaceClassification {
  const markdown = classifyManagedMarkdown(probe.markdown);
  const pluginData = classifyPluginData(probe.pluginData);

  if (markdown.kind === "absent" && pluginData.kind === "absent") {
    return {
      blockers: [],
      canBootstrap: true,
      canLoad: false,
      markdown,
      mode: "fresh",
      pluginData,
    };
  }

  if (markdown.kind === "formal-valid" && pluginData.kind === "valid") {
    return {
      blockers: [],
      canBootstrap: false,
      canLoad: true,
      markdown,
      mode: "existing",
      pluginData,
    };
  }

  const blockers: WorkspaceBlocker[] = [];

  switch (markdown.kind) {
    case "absent":
      if (pluginData.kind !== "absent") {
        blockers.push("managed-markdown-missing");
      }
      break;
    case "formal-incomplete":
      blockers.push("formal-markdown-incomplete");
      break;
    case "formal-invalid":
      blockers.push("formal-markdown-invalid");
      break;
    case "managed-root-conflict":
      blockers.push("managed-root-conflict");
      break;
    case "formal-valid":
      break;
  }

  if (pluginData.kind === "absent" && markdown.kind !== "absent") {
    blockers.push("configuration-missing");
  } else if (pluginData.kind === "invalid") {
    blockers.push("invalid-configuration");
  }

  return {
    blockers,
    canBootstrap: false,
    canLoad: false,
    markdown,
    mode: "blocked",
    pluginData,
  };
}

export function createFreshWorkspaceBootstrapPlan(
  options: FreshWorkspaceBootstrapOptions,
): FreshWorkspaceBootstrapPlan {
  return {
    directories: [...TRAIL_BOOTSTRAP_DIRECTORIES],
    files: TRAIL_BOOTSTRAP_FILES.map((file) => ({ ...file })),
    pluginData: createDefaultTrailPluginData(options),
  };
}

async function rollbackBootstrapMarkdown(
  gateway: WorkspaceBootstrapGateway,
  createdFiles: readonly { readonly content: string; readonly path: string }[],
  createdDirectories: readonly string[],
): Promise<string[]> {
  const issues: string[] = [];

  for (const file of [...createdFiles].reverse()) {
    try {
      const current = await gateway.readFile(file.path);
      if (current !== file.content) {
        issues.push(`refused rollback because created file changed: ${file.path}`);
        continue;
      }
      await gateway.deleteFile(file.path);
    } catch (error) {
      issues.push(
        `unable to rollback ${file.path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  for (const directory of [...createdDirectories].reverse()) {
    try {
      await gateway.removeDirectoryIfEmpty(directory);
    } catch (error) {
      issues.push(
        `unable to rollback ${directory}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return issues;
}

/**
 * Executes only an already-reconfirmed Fresh bootstrap. Markdown is created and
 * re-read before plugin data is saved. Once plugin-data save starts, failures are
 * left as explicit incomplete initialization rather than deleting authoritative
 * Markdown and guessing whether plugin data was persisted.
 */
export async function executeFreshWorkspaceBootstrap(
  gateway: WorkspaceBootstrapGateway,
  options: FreshWorkspaceBootstrapOptions,
): Promise<FreshWorkspaceBootstrapPlan> {
  const initial = classifyWorkspace(await gateway.probeWorkspace());
  if (!initial.canBootstrap) {
    throw new WorkspaceBootstrapError(
      `Fresh bootstrap refused for workspace mode: ${initial.mode}`,
    );
  }

  const plan = createFreshWorkspaceBootstrapPlan(options);
  const createdDirectories: string[] = [];
  const createdFiles: { content: string; path: string }[] = [];
  let pluginSaveStarted = false;

  try {
    for (const directory of plan.directories) {
      await gateway.createDirectory(directory);
      createdDirectories.push(directory);
    }

    for (const file of plan.files) {
      await gateway.createFile(file.path, file.content);
      createdFiles.push(file);
    }

    for (const file of plan.files) {
      const current = await gateway.readFile(file.path);
      if (current !== file.content) {
        throw new WorkspaceBootstrapError(
          `Bootstrap verification failed for created file: ${file.path}`,
        );
      }
    }

    pluginSaveStarted = true;
    await gateway.savePluginData(plan.pluginData);

    const persistedPluginData = classifyPluginData(await gateway.loadPluginData());
    if (persistedPluginData.kind !== "valid") {
      throw new WorkspaceBootstrapError(
        "Plugin data was not valid after bootstrap save",
      );
    }

    const finalClassification = classifyWorkspace(await gateway.probeWorkspace());
    if (!finalClassification.canLoad) {
      throw new WorkspaceBootstrapError(
        "Workspace did not classify as a valid existing Formal workspace after bootstrap",
      );
    }

    return plan;
  } catch (error) {
    if (!pluginSaveStarted) {
      const rollbackIssues = await rollbackBootstrapMarkdown(
        gateway,
        createdFiles,
        createdDirectories,
      );
      throw new WorkspaceBootstrapError(
        error instanceof Error ? error.message : String(error),
        rollbackIssues,
      );
    }

    if (error instanceof WorkspaceBootstrapError) {
      throw error;
    }

    throw new WorkspaceBootstrapError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
