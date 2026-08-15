import type { TrailIssue } from "../../domain/model/trail-core-entities";
import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";

export interface TrailRuntimeIndexes {
  readonly issuesByProjectId: Readonly<Record<string, readonly string[]>>;
}

export function sortTrailTriageIssueIds(
  issuesById: Readonly<Record<string, TrailTriageIssue>>,
): readonly string[] {
  return Object.values(issuesById)
    .slice()
    .sort((left, right) => {
      if (left.due !== right.due) return left.due - right.due;
      return left.id.localeCompare(right.id);
    })
    .map((issue) => issue.id);
}

export function sortTrailProjectIds(
  projectsById: Readonly<Record<string, TrailProject>>,
): readonly string[] {
  return Object.values(projectsById)
    .slice()
    .sort((left, right) => {
      const title = left.title.localeCompare(right.title);
      return title !== 0 ? title : left.id.localeCompare(right.id);
    })
    .map((project) => project.id);
}

/** Replaces only the Project relation entries touched by one source contribution. */
export function replaceTrailIssueProjectIndex(
  indexes: TrailRuntimeIndexes,
  previousIssues: readonly TrailIssue[],
  nextIssues: readonly TrailIssue[],
): TrailRuntimeIndexes {
  const issuesByProjectId = { ...indexes.issuesByProjectId };
  const affectedProjectIds = new Set<string>();

  for (const issue of [...previousIssues, ...nextIssues]) {
    if (issue.projectId !== undefined) affectedProjectIds.add(issue.projectId);
  }

  for (const projectId of affectedProjectIds) {
    const issueIds = new Set(issuesByProjectId[projectId] ?? []);
    for (const issue of previousIssues) {
      if (issue.projectId === projectId) issueIds.delete(issue.id);
    }
    for (const issue of nextIssues) {
      if (issue.projectId === projectId) issueIds.add(issue.id);
    }

    if (issueIds.size === 0) {
      delete issuesByProjectId[projectId];
    } else {
      issuesByProjectId[projectId] = [...issueIds].sort();
    }
  }

  return { issuesByProjectId };
}
