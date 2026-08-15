import {
  isTrailProjectsScopePath,
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../markdown/schema/trail-paths";
import {
  selectAllSourceIssues,
  selectSourceIssuesForPath,
  type TrailRuntimeState,
} from "../runtime/store/trail-runtime-store";

export function selectTriageSourceIssues(
  state: TrailRuntimeState,
) {
  return selectSourceIssuesForPath(state, TRAIL_TRIAGE_PATH);
}

export function selectWorkflowRootSourceIssues(
  state: TrailRuntimeState,
) {
  return selectSourceIssuesForPath(state, TRAIL_PROJECTS_PATH);
}

export function selectWorkflowSourceIssues(
  state: TrailRuntimeState,
) {
  return selectAllSourceIssues(state).filter((issue) =>
    isTrailProjectsScopePath(issue.filePath)
  );
}

export function selectEntitySourceIssues(
  state: TrailRuntimeState,
  entityId: string,
) {
  return selectSourceIssuesForPath(
    state,
    state.committed.ownership.sourceByEntityId[entityId],
  );
}
