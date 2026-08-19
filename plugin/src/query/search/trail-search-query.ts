import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export type TrailSearchResultKind =
  | "initiative"
  | "milestone"
  | "project"
  | "triage-issue"
  | "workflow-issue";

export interface TrailSearchResult {
  readonly entityId: string;
  readonly kind: TrailSearchResultKind;
  readonly projectId?: string;
  readonly title: string;
}

interface RankedTrailSearchResult extends TrailSearchResult {
  readonly rank: number;
}

const KIND_ORDER: Readonly<Record<TrailSearchResultKind, number>> = {
  "workflow-issue": 0,
  "triage-issue": 1,
  project: 2,
  initiative: 3,
  milestone: 4,
};

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function matchRank(title: string, description: string | undefined, query: string): number | undefined {
  const normalizedTitle = normalizeSearchText(title);
  if (normalizedTitle === query) return 0;
  if (normalizedTitle.startsWith(query)) return 1;
  if (normalizedTitle.includes(query)) return 2;
  if (description !== undefined && normalizeSearchText(description).includes(query)) return 3;
  return undefined;
}

/**
 * Global Search stays a read-only Runtime projection. It searches title-bearing
 * work objects only; Cycles remain on their dedicated time-oriented surface
 * because they do not own a canonical user-facing title.
 */
export function selectTrailSearchResults(
  state: TrailRuntimeState,
  query: string,
): readonly TrailSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") return [];

  const domain = selectTrailReadableRuntimeSnapshot(state).authoritative.domain;
  const results: RankedTrailSearchResult[] = [];

  const add = (result: TrailSearchResult, description?: string): void => {
    const rank = matchRank(result.title, description, normalizedQuery);
    if (rank !== undefined) results.push({ ...result, rank });
  };

  for (const initiative of domain.initiativesById.values()) {
    add({ entityId: initiative.id, kind: "initiative", title: initiative.title }, initiative.description);
  }
  for (const project of domain.projectsById.values()) {
    add({ entityId: project.id, kind: "project", title: project.title }, project.description);
  }
  for (const milestone of domain.milestonesById.values()) {
    add({
      entityId: milestone.id,
      kind: "milestone",
      projectId: milestone.projectId,
      title: milestone.title,
    }, milestone.description);
  }
  for (const issue of domain.issuesById.values()) {
    add({
      entityId: issue.id,
      kind: issue.context === "triage" ? "triage-issue" : "workflow-issue",
      ...(issue.context === "workflow" && issue.projectId !== undefined
        ? { projectId: issue.projectId }
        : {}),
      title: issue.title,
    }, issue.description);
  }

  return results
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      const titleOrder = left.title.localeCompare(right.title);
      if (titleOrder !== 0) return titleOrder;
      const kindOrder = KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
      return kindOrder !== 0 ? kindOrder : left.entityId.localeCompare(right.entityId);
    })
    .map(({ rank: _rank, ...result }) => result);
}
