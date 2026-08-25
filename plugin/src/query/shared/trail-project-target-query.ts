import type { TrailProject } from "../../domain/model/trail-entities";
import { canTrailProjectAcceptWorkflowIssue } from "../../domain/rules/trail-project-rules";
import {
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "../../domain/rules/trail-status-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";

function compareProjects(left: TrailProject, right: TrailProject): number {
  const titleOrder = left.title.localeCompare(right.title);
  return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
}

/** Resolves the Workspace reference as an ordinary readable Project, if present. */
export function selectTrailReadableDefaultProject(
  state: TrailRuntimeState,
): TrailProject | undefined {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const defaultProjectId = readable.authoritative.workspaceState?.defaultProjectId;
  return defaultProjectId === undefined
    ? undefined
    : readable.authoritative.domain.projectsById.get(defaultProjectId);
}

/**
 * Triage Accept creates a Backlog Workflow Issue, so only Projects that can
 * accept that non-terminal state are legal targets.
 */
export function selectTrailTriageAcceptProjectIds(
  state: TrailRuntimeState,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
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
    .sort(compareProjects)
    .map((project) => project.id);
}

/** Default is only an initial UI candidate; absent or illegal means no preselection. */
export function selectTrailDefaultTriageAcceptProjectId(
  state: TrailRuntimeState,
): string | undefined {
  const defaultProject = selectTrailReadableDefaultProject(state);
  if (defaultProject === undefined) return undefined;
  return selectTrailTriageAcceptProjectIds(state).includes(defaultProject.id)
    ? defaultProject.id
    : undefined;
}
