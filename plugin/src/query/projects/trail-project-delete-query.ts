import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailIssue,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import { canTrailProjectAcceptWorkflowIssue } from "../../domain/rules/trail-project-rules";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

export interface TrailProjectDeleteReplacementOption {
  readonly id: string;
  readonly title: string;
}

export interface TrailProjectDeleteReadModel {
  readonly childIssueCount: number;
  readonly expectedProject: TrailProject;
  readonly isDefaultProject: boolean;
  readonly milestoneCount: number;
  readonly replacementProjects: readonly TrailProjectDeleteReplacementOption[];
}

function workflowIssuesForProject(
  projectId: string,
  issueIds: readonly string[],
  issuesById: ReadonlyMap<string, TrailIssue>,
): readonly TrailWorkflowIssue[] {
  return issueIds
    .map((issueId) => issuesById.get(issueId))
    .filter((issue): issue is TrailWorkflowIssue => (
      issue?.context === "workflow" && issue.projectId === projectId
    ));
}

/** Projects that can accept every current child Issue without changing its Status. */
function canAcceptAllIssues(
  project: TrailProject,
  issues: readonly TrailWorkflowIssue[],
  configuration: TrailConfiguration,
): boolean {
  const projectStatus = resolveTrailStatusDefinition(
    configuration,
    "project",
    project.statusDefinitionId,
  );
  if (projectStatus === undefined) return false;

  return issues.every((issue) => {
    const issueStatus = resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    );
    return issueStatus !== undefined
      && canTrailProjectAcceptWorkflowIssue(projectStatus, issueStatus);
  });
}

/** Focused consequence/target projection for the Project delete workflow. */
export function selectTrailProjectDeleteReadModel(
  state: TrailRuntimeState,
  projectId: string,
): TrailProjectDeleteReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const { configuration, domain, workspaceState } = readable.authoritative;
  if (configuration === null || workspaceState === null) return null;

  const project = domain.projectsById.get(projectId);
  if (project === undefined) return null;

  const childIssues = workflowIssuesForProject(
    projectId,
    readable.indexes.issuesByProjectId.get(projectId) ?? [],
    domain.issuesById,
  );
  const replacementProjects = childIssues.length === 0
    ? []
    : [...domain.projectsById.values()]
        .filter((candidate) => candidate.id !== projectId)
        .filter((candidate) => canAcceptAllIssues(candidate, childIssues, configuration))
        .sort((left, right) => {
          const titleOrder = left.title.localeCompare(right.title);
          return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
        })
        .map(({ id, title }) => ({ id, title }));

  return {
    childIssueCount: childIssues.length,
    expectedProject: project,
    isDefaultProject: workspaceState.defaultProjectId === projectId,
    milestoneCount: (readable.indexes.milestonesByProjectId.get(projectId) ?? []).length,
    replacementProjects,
  };
}
