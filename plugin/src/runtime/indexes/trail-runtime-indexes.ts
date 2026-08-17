import type { TrailDomainState } from "../store/trail-runtime-store";

export interface TrailRuntimeIndexes {
  readonly issuesByProjectId: ReadonlyMap<string, readonly string[]>;
}

export function buildTrailRuntimeIndexes(domain: TrailDomainState): TrailRuntimeIndexes {
  const issueIdsByProjectId = new Map<string, string[]>();
  for (const issue of domain.issuesById.values()) {
    if (issue.projectId === undefined) continue;
    const issueIds = issueIdsByProjectId.get(issue.projectId) ?? [];
    issueIds.push(issue.id);
    issueIdsByProjectId.set(issue.projectId, issueIds);
  }
  return {
    issuesByProjectId: new Map(
      [...issueIdsByProjectId.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([projectId, issueIds]) => [projectId, issueIds.sort()] as const),
    ),
  };
}
