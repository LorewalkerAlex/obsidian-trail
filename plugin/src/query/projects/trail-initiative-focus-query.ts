import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailProject } from "../../domain/model/trail-entities";
import type { TrailProjectId, TrailTimestamp } from "../../domain/model/trail-values";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import { isTrailCollectionFilterActive } from "../shared/trail-collection-filter";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import {
  compareTrailProjectOrder,
  createTrailProjectSummaryReadModel,
  matchesTrailProjectCollectionFilter,
  requireTrailProjectStatus,
  selectTrailInitiativeTargets,
  selectTrailWorkflowIssuesForProject,
  type TrailInitiativeTargetReadModel,
  type TrailProjectCollectionFilterPropertyId,
  type TrailProjectCollectionFilterState,
  type TrailProjectSummaryReadModel,
} from "./trail-project-collection-query";

export type TrailInitiativeFocusFilterPropertyId = TrailProjectCollectionFilterPropertyId;
export type TrailInitiativeFocusFilterState = TrailProjectCollectionFilterState;
export type TrailInitiativeFocusEmptyKind = "filtered" | "true";

export interface TrailInitiativeFocusReadInput {
  readonly filter: TrailInitiativeFocusFilterState;
  readonly initiativeId: string;
  readonly now: TrailTimestamp;
}

export interface TrailInitiativeFocusReadModel {
  readonly configuration: TrailConfiguration;
  readonly emptyKind?: TrailInitiativeFocusEmptyKind;
  readonly initiative: {
    readonly description?: string;
    readonly id: string;
    readonly title: string;
  };
  readonly initiatives: readonly TrailInitiativeTargetReadModel[];
  readonly projects: readonly TrailProjectSummaryReadModel[];
  readonly visibleProjectIds: readonly TrailProjectId[];
}

function projectsForInitiative(
  readable: TrailEffectiveRuntimeSnapshot,
  initiativeId: string,
): readonly TrailProject[] {
  return (readable.indexes.projectsByInitiativeId.get(initiativeId) ?? []).map((projectId) => {
    const project = readable.authoritative.domain.projectsById.get(projectId);
    if (project === undefined || project.initiativeId !== initiativeId) {
      throw new Error(`Initiative ${initiativeId} has an unreadable Project ${projectId}`);
    }
    return project;
  });
}

/**
 * Builds the Initiative-scoped Project collection from one readable Runtime snapshot.
 * Initiative scope is structural; Filter and `now` remain transient UI inputs.
 */
export function selectTrailInitiativeFocusReadModel(
  state: TrailRuntimeState,
  input: TrailInitiativeFocusReadInput,
): TrailInitiativeFocusReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const initiative = readable.authoritative.domain.initiativesById.get(input.initiativeId);
  if (initiative === undefined) return null;

  const scopedProjects = projectsForInitiative(readable, initiative.id);
  const visibleProjects = scopedProjects
    .filter((project) => matchesTrailProjectCollectionFilter(
      project,
      requireTrailProjectStatus(configuration, project),
      { filter: input.filter, now: input.now },
      configuration,
    ))
    .sort((left, right) => compareTrailProjectOrder(configuration, left, right));
  const projects = visibleProjects.map((project) => {
    const status = requireTrailProjectStatus(configuration, project);
    const issues = selectTrailWorkflowIssuesForProject(readable, configuration, project.id);
    return createTrailProjectSummaryReadModel(project, status, issues);
  });
  const filterActive = isTrailCollectionFilterActive(input.filter);
  const emptyKind = scopedProjects.length === 0
    ? "true"
    : projects.length === 0 && filterActive
      ? "filtered"
      : undefined;

  return {
    configuration,
    emptyKind,
    initiative: {
      description: initiative.description,
      id: initiative.id,
      title: initiative.title,
    },
    initiatives: selectTrailInitiativeTargets(readable),
    projects,
    visibleProjectIds: projects.map(({ id }) => id),
  };
}
