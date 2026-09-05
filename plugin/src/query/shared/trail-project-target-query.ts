import type { TrailProject } from "../../domain/model/trail-entities";
import { canTrailProjectAcceptWorkflowIssue } from "../../domain/rules/trail-project-rules";
import {
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../../domain/rules/trail-status-rules";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";

function compareProjects(left: TrailProject, right: TrailProject): number {
  const titleOrder = left.title.localeCompare(right.title);
  return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
}

/** Resolves the Workspace reference as an ordinary readable Project, if present. */
export function selectTrailReadableDefaultProjectFromReadableSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
): TrailProject | undefined {
  const defaultProjectId = readable.authoritative.workspaceState?.defaultProjectId;
  return defaultProjectId === undefined
    ? undefined
    : readable.authoritative.domain.projectsById.get(defaultProjectId);
}

export function selectTrailReadableDefaultProject(
  state: TrailRuntimeState,
): TrailProject | undefined {
  return selectTrailReadableDefaultProjectFromReadableSnapshot(
    selectTrailReadableRuntimeSnapshot(state),
  );
}

/**
 * Triage Accept creates a Backlog Workflow Issue, so only Projects that can
 * accept that non-terminal state are legal targets.
 */
export function selectTrailTriageAcceptProjectsFromReadableSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
): readonly TrailProject[] {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const backlog = resolveTrailDefaultStatusDefinition(configuration, "issue", "backlog");
  return [...readable.authoritative.domain.projectsById.values()]
    .filter((project) => {
      const projectStatus = resolveTrailStatusDefinition(
        configuration,
        "project",
        project.statusDefinitionId,
      );
      return projectStatus !== undefined
        && canTrailProjectAcceptWorkflowIssue(projectStatus, backlog);
    })
    .sort(compareProjects);
}

export function selectTrailTriageAcceptProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  return selectTrailTriageAcceptProjectsFromReadableSnapshot(
    selectTrailReadableRuntimeSnapshot(state),
  ).map((project) => project.id);
}

/** Default is only an initial UI candidate; absent or illegal means no preselection. */
export function selectTrailDefaultTriageAcceptProjectIdFromReadableSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
): string | undefined {
  const defaultProject = selectTrailReadableDefaultProjectFromReadableSnapshot(readable);
  if (defaultProject === undefined) return undefined;
  return selectTrailTriageAcceptProjectsFromReadableSnapshot(readable)
    .some((project) => project.id === defaultProject.id)
    ? defaultProject.id
    : undefined;
}

export function selectTrailDefaultTriageAcceptProjectId(
  state: TrailRuntimeState,
): string | undefined {
  return selectTrailDefaultTriageAcceptProjectIdFromReadableSnapshot(
    selectTrailReadableRuntimeSnapshot(state),
  );
}

/**
 * Workflow Issue Move exposes only explicit Project destinations that can accept
 * the Issue's current Status. The current Project remains visible as the selected
 * relationship even when moving into that lifecycle state would not be legal.
 */
export function selectTrailWorkflowIssueMoveProjectIds(
  state: TrailRuntimeState,
  issueId: string,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const issue = readable.authoritative.domain.issuesById.get(issueId);
  if (issue?.context !== "workflow") return [];
  const issueStatus = resolveTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );

  return [...readable.authoritative.domain.projectsById.values()]
    .filter((project) => {
      if (project.id === issue.projectId) return true;
      if (issueStatus === undefined) return false;
      const projectStatus = resolveTrailStatusDefinition(
        configuration,
        "project",
        project.statusDefinitionId,
      );
      return projectStatus !== undefined
        && canTrailProjectAcceptWorkflowIssue(projectStatus, issueStatus);
    })
    .sort(compareProjects)
    .map((project) => project.id);
}
