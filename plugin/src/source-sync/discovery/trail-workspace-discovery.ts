import {
  TRAIL_COLLECTIONS_PATH,
  TRAIL_CYCLES_PATH,
  TRAIL_INITIATIVES_PATH,
  TRAIL_MANAGED_ROOT,
  TRAIL_PROJECTS_PATH,
  TRAIL_REQUIRED_SINGLETON_PATHS,
  TRAIL_TOP_LEVEL_DIRECTORIES,
  TRAIL_TOP_LEVEL_DIRECTORY_PATHS,
  TRAIL_TRIAGE_PATH,
  TRAIL_WEEKLY_UPDATE_PATH,
  isTrailSequencedEntityFilename,
  readTrailEntityFileSequence,
} from "../../markdown/schema/trail-paths";
import type {
  TrailDomainSourceRepository,
  TrailManagedDomainSourceKind,
} from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailPersistedPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type {
  TrailPluginDataReadResult,
  TrailPluginDataRepository,
} from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO } from "../../persistence/ports/trail-workspace-layout-io";

export type TrailWorkspaceBlockerCode =
  | "configuration-invalid"
  | "configuration-missing"
  | "managed-markdown-incomplete"
  | "managed-markdown-invalid"
  | "managed-markdown-missing"
  | "managed-root-conflict";

export interface TrailWorkspaceBlocker {
  readonly code: TrailWorkspaceBlockerCode;
  readonly message: string;
  readonly path?: string;
}

export interface TrailDiscoveredDomainSource {
  readonly kind: TrailManagedDomainSourceKind;
  readonly path: string;
}

export type TrailWorkspaceDiscovery =
  | {
      readonly blockers: readonly [];
      readonly mode: "fresh";
    }
  | {
      readonly blockers: readonly [];
      readonly mode: "existing";
      readonly pluginData: TrailPersistedPluginDataSnapshot;
      readonly sources: readonly TrailDiscoveredDomainSource[];
    }
  | {
      readonly blockers: readonly TrailWorkspaceBlocker[];
      readonly mode: "blocked";
    };

function blocker(
  code: TrailWorkspaceBlockerCode,
  message: string,
  path?: string,
): TrailWorkspaceBlocker {
  return { code, message, path };
}

function pluginDataBlocker(result: TrailPluginDataReadResult): TrailWorkspaceBlocker | undefined {
  if (result.kind === "absent") {
    return blocker("configuration-missing", "Trail Plugin Data is missing");
  }
  if (result.kind === "invalid") {
    return blocker(
      "configuration-invalid",
      `Trail Plugin Data is invalid: ${result.issues.map(({ message }) => message).join("; ")}`,
    );
  }
  return undefined;
}

async function inspectTopLevel(
  domainSources: Pick<TrailDomainSourceRepository, "list">,
  blockers: TrailWorkspaceBlocker[],
): Promise<void> {
  const entries = await domainSources.list(TRAIL_MANAGED_ROOT);
  const expected = new Set<string>(TRAIL_TOP_LEVEL_DIRECTORIES);
  const byName = new Map(entries.map((entry) => [entry.name, entry] as const));

  for (let index = 0; index < TRAIL_TOP_LEVEL_DIRECTORIES.length; index += 1) {
    const name = TRAIL_TOP_LEVEL_DIRECTORIES[index];
    const path = TRAIL_TOP_LEVEL_DIRECTORY_PATHS[index];
    const entry = byName.get(name);
    if (entry === undefined || entry.kind !== "directory") {
      blockers.push(blocker(
        "managed-markdown-incomplete",
        `${path} must exist as a managed directory`,
        path,
      ));
    }
  }
  for (const entry of entries) {
    if (!expected.has(entry.name)) {
      blockers.push(blocker(
        "managed-root-conflict",
        `Unexpected entry under Trail managed root: ${entry.name}`,
        entry.path,
      ));
    }
  }
}

async function inspectRequiredSingletons(
  layout: TrailWorkspaceLayoutIO,
  blockers: TrailWorkspaceBlocker[],
): Promise<void> {
  for (const path of TRAIL_REQUIRED_SINGLETON_PATHS) {
    const kind = await layout.pathKind(path);
    if (kind !== "file") {
      blockers.push(blocker(
        "managed-markdown-incomplete",
        `Required Trail singleton must exist as a file: ${path}`,
        path,
      ));
    }
  }
}

function discoverSequencedSources(
  entries: Awaited<ReturnType<TrailDomainSourceRepository["list"]>>,
  sourceKind: "initiative" | "project",
  blockers: TrailWorkspaceBlocker[],
): readonly TrailDiscoveredDomainSource[] {
  const seenSequences = new Set<number>();
  const sources: TrailDiscoveredDomainSource[] = [];
  for (const entry of entries) {
    if (entry.kind !== "file" || !isTrailSequencedEntityFilename(entry.name)) {
      blockers.push(blocker(
        "managed-markdown-invalid",
        `Unexpected ${sourceKind} entry in managed directory: ${entry.name}`,
        entry.path,
      ));
      continue;
    }
    const sequence = readTrailEntityFileSequence(entry.name)!;
    if (seenSequences.has(sequence)) {
      blockers.push(blocker(
        "managed-markdown-invalid",
        `Duplicate ${sourceKind} physical sequence: ${String(sequence).padStart(4, "0")}`,
        entry.path,
      ));
      continue;
    }
    seenSequences.add(sequence);
    sources.push({ kind: sourceKind, path: entry.path });
  }
  return sources.sort((left, right) => left.path.localeCompare(right.path));
}

async function inspectCollections(
  domainSources: Pick<TrailDomainSourceRepository, "list">,
  blockers: TrailWorkspaceBlocker[],
): Promise<void> {
  const allowed = new Set<string>([
    TRAIL_TRIAGE_PATH,
    TRAIL_CYCLES_PATH,
    TRAIL_WEEKLY_UPDATE_PATH,
  ]);
  for (const entry of await domainSources.list(TRAIL_COLLECTIONS_PATH)) {
    if (entry.kind !== "file" || !allowed.has(entry.path)) {
      blockers.push(blocker(
        "managed-markdown-invalid",
        `Unexpected managed Collections entry: ${entry.name}`,
        entry.path,
      ));
    }
  }
}

/** Discovers authoritative carriers without parsing them or publishing Runtime state. */
export async function discoverTrailWorkspace(input: {
  readonly domainSources: Pick<TrailDomainSourceRepository, "list">;
  readonly layout: TrailWorkspaceLayoutIO;
  readonly pluginData: Pick<TrailPluginDataRepository, "read">;
}): Promise<TrailWorkspaceDiscovery> {
  const [rootKind, pluginData] = await Promise.all([
    input.layout.pathKind(TRAIL_MANAGED_ROOT),
    input.pluginData.read(),
  ]);

  if (rootKind === "missing") {
    if (pluginData.kind === "absent") return { blockers: [], mode: "fresh" };
    return {
      blockers: [blocker(
        "managed-markdown-missing",
        "Trail Plugin Data exists but the managed Markdown root is missing",
        TRAIL_MANAGED_ROOT,
      )],
      mode: "blocked",
    };
  }
  if (rootKind !== "directory") {
    return {
      blockers: [blocker(
        "managed-root-conflict",
        "Trail managed root must be a directory",
        TRAIL_MANAGED_ROOT,
      )],
      mode: "blocked",
    };
  }

  const blockers: TrailWorkspaceBlocker[] = [];
  const pluginBlocker = pluginDataBlocker(pluginData);
  if (pluginBlocker !== undefined) blockers.push(pluginBlocker);
  await inspectTopLevel(input.domainSources, blockers);
  await inspectRequiredSingletons(input.layout, blockers);

  let initiatives: readonly TrailDiscoveredDomainSource[] = [];
  let projects: readonly TrailDiscoveredDomainSource[] = [];
  const topLevelHealthy = !blockers.some(({ code }) => (
    code === "managed-root-conflict" || code === "managed-markdown-incomplete"
  ));
  if (topLevelHealthy) {
    initiatives = discoverSequencedSources(
      await input.domainSources.list(TRAIL_INITIATIVES_PATH),
      "initiative",
      blockers,
    );
    projects = discoverSequencedSources(
      await input.domainSources.list(TRAIL_PROJECTS_PATH),
      "project",
      blockers,
    );
    await inspectCollections(input.domainSources, blockers);
  }

  if (blockers.length > 0 || pluginData.kind !== "valid") {
    return { blockers, mode: "blocked" };
  }

  return {
    blockers: [],
    mode: "existing",
    pluginData: pluginData.snapshot,
    sources: [
      ...initiatives,
      ...projects,
      { kind: "triage", path: TRAIL_TRIAGE_PATH },
      { kind: "cycles", path: TRAIL_CYCLES_PATH },
    ],
  };
}
