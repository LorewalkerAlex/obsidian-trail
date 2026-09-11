import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export type TrailSidebarSearchResultKind =
  | "initiative"
  | "project"
  | "workflow-issue";

export interface TrailSidebarSearchResultReadModel {
  readonly entityId: string;
  readonly kind: TrailSidebarSearchResultKind;
  readonly title: string;
}

export interface TrailSidebarSearchReadModel {
  readonly initiatives: readonly TrailSidebarSearchResultReadModel[];
  readonly issues: readonly TrailSidebarSearchResultReadModel[];
  readonly projects: readonly TrailSidebarSearchResultReadModel[];
}

interface RankedTrailSidebarSearchResult extends TrailSidebarSearchResultReadModel {
  readonly rank: number;
}

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

function sortRankedResults(
  results: RankedTrailSidebarSearchResult[],
): readonly TrailSidebarSearchResultReadModel[] {
  return results
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.entityId.localeCompare(right.entityId);
    })
    .map(({ rank: _rank, ...result }) => result);
}

/**
 * Sidebar Search is a read-only Runtime projection for the frozen V1 result set:
 * Initiative, Project, and Workflow Issue. Triage, Milestone, Cycle, and Vault-note
 * discovery stay outside this Trail Sidebar mode.
 */
export function selectTrailSidebarSearchReadModel(
  state: TrailRuntimeState,
  query: string,
): TrailSidebarSearchReadModel {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") {
    return { initiatives: [], issues: [], projects: [] };
  }

  const domain = selectTrailReadableRuntimeSnapshot(state).authoritative.domain;
  const initiatives: RankedTrailSidebarSearchResult[] = [];
  const projects: RankedTrailSidebarSearchResult[] = [];
  const issues: RankedTrailSidebarSearchResult[] = [];

  const add = (
    results: RankedTrailSidebarSearchResult[],
    result: TrailSidebarSearchResultReadModel,
    description?: string,
  ): void => {
    const rank = matchRank(result.title, description, normalizedQuery);
    if (rank !== undefined) results.push({ ...result, rank });
  };

  for (const initiative of domain.initiativesById.values()) {
    add(
      initiatives,
      { entityId: initiative.id, kind: "initiative", title: initiative.title },
      initiative.description,
    );
  }

  for (const project of domain.projectsById.values()) {
    add(
      projects,
      { entityId: project.id, kind: "project", title: project.title },
      project.description,
    );
  }

  for (const issue of domain.issuesById.values()) {
    if (issue.context !== "workflow") continue;
    add(
      issues,
      { entityId: issue.id, kind: "workflow-issue", title: issue.title },
      issue.description,
    );
  }

  return {
    initiatives: sortRankedResults(initiatives),
    issues: sortRankedResults(issues),
    projects: sortRankedResults(projects),
  };
}
