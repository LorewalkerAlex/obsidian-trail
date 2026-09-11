import type { TrailProject } from "../../domain/model/trail-entities";
import { findTrailNonTerminalProjectChildIssue } from "../../domain/rules/trail-project-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { selectTrailReadableRuntimeSnapshot } from "./trail-effective-query";
import { selectTrailStatusOptionGroups } from "./trail-status-query";

export const TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID = "project.initiative.none";

export interface TrailProjectActionNamedTargetReadModel {
  readonly id: string;
  readonly label: string;
}

export interface TrailProjectActionItemReadModel {
  readonly currentInitiativeTargetId: string;
  readonly currentStatusDefinitionId: string;
  readonly expectedProject: TrailProject;
  readonly legalInitiativeTargets: readonly TrailProjectActionNamedTargetReadModel[];
  readonly legalStatusTargets: readonly TrailProjectActionNamedTargetReadModel[];
}

export interface TrailProjectActionFactsReadModel {
  readonly controlKind: TrailRuntimeState["control"]["kind"];
  readonly projects: readonly TrailProjectActionItemReadModel[];
}

/**
 * Read-side facts for Project collection actions. Query owns target legality;
 * Application/Domain still revalidate every submitted Project mutation.
 */
export function selectTrailProjectActionFacts(
  state: TrailRuntimeState,
  projectIds: readonly string[],
): TrailProjectActionFactsReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const projects: TrailProject[] = [];
  for (const projectId of projectIds) {
    const project = readable.authoritative.domain.projectsById.get(projectId);
    if (project === undefined) return null;
    projects.push(project);
  }

  const statusDefinitions = selectTrailStatusOptionGroups(configuration, "project")
    .flatMap((group) => group.definitions);
  const initiativeTargets: readonly TrailProjectActionNamedTargetReadModel[] = [
    { id: TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID, label: "No initiative" },
    ...[...readable.authoritative.domain.initiativesById.values()]
      .sort((left, right) => {
        const titleOrder = left.title.localeCompare(right.title);
        return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
      })
      .map((initiative) => ({ id: initiative.id, label: initiative.title })),
  ];

  return {
    controlKind: state.control.kind,
    projects: projects.map((project) => {
      const activeChild = findTrailNonTerminalProjectChildIssue(
        configuration,
        readable.authoritative.domain.issuesById.values(),
        project.id,
      );
      return {
        currentInitiativeTargetId: project.initiativeId ?? TRAIL_PROJECT_NO_INITIATIVE_TARGET_ID,
        currentStatusDefinitionId: project.statusDefinitionId,
        expectedProject: project,
        legalInitiativeTargets: initiativeTargets,
        legalStatusTargets: statusDefinitions
          .filter((definition) => (
            definition.id === project.statusDefinitionId
            || definition.category !== "completed"
            || activeChild === undefined
          ))
          .map((definition) => ({ id: definition.id, label: definition.name })),
      };
    }),
  };
}
