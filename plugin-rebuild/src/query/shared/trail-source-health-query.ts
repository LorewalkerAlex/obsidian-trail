import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";

export function selectTrailSourceIssuesForPath(
  state: TrailRuntimeState,
  sourcePath: string | undefined,
) {
  return sourcePath === undefined
    ? []
    : state.health.sourceIssuesByPath[sourcePath] ?? [];
}

/**
 * Triage source identity is discovered through Runtime ownership rather than by
 * teaching Query about Markdown paths. Empty-source failures still surface via
 * global Runtime control, while an existing LKG Triage contribution keeps its
 * source-scoped diagnostics available here.
 */
export function selectTrailTriageSourceIssues(state: TrailRuntimeState) {
  const triageIssue = [...state.committed.authoritative.domain.issuesById.values()]
    .find((issue) => issue.context === "triage");
  return triageIssue === undefined
    ? []
    : selectTrailSourceIssuesForPath(
        state,
        state.committed.ownership.sourceByEntityId.get(triageIssue.id),
      );
}

export function selectTrailProjectSourceIssues(state: TrailRuntimeState) {
  const sourcePaths = new Set<string>();
  for (const projectId of state.committed.authoritative.domain.projectsById.keys()) {
    const sourcePath = state.committed.ownership.sourceByEntityId.get(projectId);
    if (sourcePath !== undefined) sourcePaths.add(sourcePath);
  }
  return [...sourcePaths]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((sourcePath) => selectTrailSourceIssuesForPath(state, sourcePath));
}

export function selectTrailEntitySourceIssues(
  state: TrailRuntimeState,
  entityId: string,
) {
  return selectTrailSourceIssuesForPath(
    state,
    state.committed.ownership.sourceByEntityId.get(entityId),
  );
}
