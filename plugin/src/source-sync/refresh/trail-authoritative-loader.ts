import { validateTrailWorkspaceGraph, type TrailWorkspaceValidationIssue } from "../../domain/validation/trail-workspace-validation";
import type { TrailDomainSourceRepository } from "../../persistence/domain-sources/trail-domain-source-repository";
import type { TrailSourceProblem } from "../../persistence/domain-sources/trail-source-result";
import { isTrailPluginDataSnapshot } from "../../persistence/plugin-data/trail-plugin-data-codec";
import type { TrailPluginDataRepository } from "../../persistence/plugin-data/trail-plugin-data-repository";
import type { TrailWorkspaceLayoutIO } from "../../persistence/ports/trail-workspace-layout-io";
import {
  buildTrailCommittedRuntimeCandidate,
  type TrailRuntimeCandidate,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import { discoverTrailWorkspace, type TrailWorkspaceBlocker } from "../discovery/trail-workspace-discovery";

export class TrailAuthoritativeLoadError extends Error {
  public constructor(
    message: string,
    readonly details: readonly (TrailSourceProblem | TrailWorkspaceBlocker | TrailWorkspaceValidationIssue)[] = [],
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TrailAuthoritativeLoadError";
  }
}

/** Loads and validates a complete authoritative candidate without touching live Runtime. */
export async function loadTrailAuthoritativeRuntimeCandidate(input: {
  readonly domainSources: TrailDomainSourceRepository;
  readonly layout: TrailWorkspaceLayoutIO;
  readonly pluginData: TrailPluginDataRepository;
}): Promise<TrailRuntimeCandidate> {
  const discovery = await discoverTrailWorkspace(input);
  if (discovery.mode !== "existing") {
    throw new TrailAuthoritativeLoadError(
      `Trail workspace is not loadable: ${discovery.mode}`,
      discovery.mode === "blocked" ? discovery.blockers : [],
    );
  }
  if (!isTrailPluginDataSnapshot(discovery.pluginData)) {
    throw new TrailAuthoritativeLoadError(
      "Trail workspace is missing required Default Project reference",
    );
  }

  const sources = [];
  const sourceProblems: TrailSourceProblem[] = [];
  for (const descriptor of discovery.sources) {
    const result = await input.domainSources.read(descriptor.kind, descriptor.path);
    if (result.kind === "rejected") {
      sourceProblems.push(...result.issues);
      continue;
    }
    sources.push(result.snapshot);
    sourceProblems.push(...result.issues);
  }
  if (sourceProblems.length > 0 || sources.length !== discovery.sources.length) {
    throw new TrailAuthoritativeLoadError(
      "Managed Domain sources failed authoritative validation",
      sourceProblems,
    );
  }

  let committed: TrailRuntimeCandidate["committed"];
  try {
    committed = buildTrailCommittedRuntimeCandidate({
      pluginData: discovery.pluginData,
      sources,
    });
  } catch (error: unknown) {
    throw new TrailAuthoritativeLoadError(
      "Managed Domain sources violate global identity or ownership invariants",
      [],
      error,
    );
  }

  const workspaceIssues = validateTrailWorkspaceGraph({
    configuration: discovery.pluginData.configuration,
    domain: committed.authoritative.domain,
    workspaceState: discovery.pluginData.workspaceState,
  });
  if (workspaceIssues.length > 0) {
    throw new TrailAuthoritativeLoadError(
      "Trail workspace failed cross-record validation",
      workspaceIssues,
    );
  }

  return {
    committed,
    health: { sourceIssuesByPath: {} },
  };
}
