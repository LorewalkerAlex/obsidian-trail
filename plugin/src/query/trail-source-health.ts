import {
  TRAIL_PROJECTS_PATH,
  TRAIL_TRIAGE_PATH,
} from "../domain/trail-physical-schema";
import {
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
  return state.committed.sourceIssues.filter((issue) => (
    issue.filePath === TRAIL_PROJECTS_PATH
    || issue.filePath.startsWith(`${TRAIL_PROJECTS_PATH}/`)
  ));
}

export function selectEntitySourceIssues(
  state: TrailRuntimeState,
  entityId: string,
) {
  return selectSourceIssuesForPath(
    state,
    state.committed.sourceByEntityId[entityId],
  );
}
