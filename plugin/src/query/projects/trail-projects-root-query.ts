import type { TrailConfiguration, TrailStatusDefinition } from "../../domain/model/trail-configuration";
import type {
  TrailMilestone,
  TrailProject,
} from "../../domain/model/trail-entities";
import {
  type TrailProjectId,
  type TrailProjectStatusCategory,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  type TrailCollectionFilterClause,
  type TrailCollectionFilterState,
  type TrailDiscreteFilterClause,
  isTrailCollectionFilterActive,
  matchesTrailOptionalDiscreteFilter,
} from "../shared/trail-collection-filter";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import {
  compareTrailProjectOrder,
  createTrailProjectSummaryReadModel,
  matchesTrailProjectCollectionFilter,
  requireTrailIssueStatus,
  requireTrailProjectStatus,
  selectTrailInitiativeTargets,
  selectTrailWorkflowIssuesForProject,
  type TrailProjectCollectionFilterPropertyId,
  type TrailProjectSummaryReadModel,
  type TrailProjectWorkflowIssueProjection,
} from "./trail-project-collection-query";

export type {
  TrailProjectProgressReadModel,
  TrailProjectSummaryReadModel,
} from "./trail-project-collection-query";

export type TrailProjectsRootFilterPropertyId =
  | TrailProjectCollectionFilterPropertyId
  | "initiative";
export type TrailProjectsRootFilterState = TrailCollectionFilterState<TrailProjectsRootFilterPropertyId>;
export type TrailProjectsRootEmptyKind = "filtered" | "projection" | "true";

export interface TrailProjectsRootReadInput {
  readonly filter: TrailProjectsRootFilterState;
  readonly now: TrailTimestamp;
}

export interface TrailProjectsRootGroupReadModel {
  readonly initiative?: {
    readonly id: string;
    readonly title: string;
  };
  readonly projects: readonly TrailProjectSummaryReadModel[];
}

export type TrailProjectTimelineDueKind = "issue" | "milestone" | "project";

export interface TrailProjectTimelineDueReadModel {
  readonly id: string;
  readonly kind: TrailProjectTimelineDueKind;
  readonly label: string;
  readonly overdue?: boolean;
  readonly timestamp: TrailTimestamp;
}

export interface TrailProjectTimelineHistoricalReadModel {
  readonly end: TrailTimestamp;
  readonly kind: "execution" | "planning";
  readonly start: TrailTimestamp;
}

export interface TrailProjectTimelineFutureReadModel {
  readonly end: TrailTimestamp;
  readonly start: TrailTimestamp;
}

export interface TrailProjectTimelineRowReadModel {
  readonly dueMarkers: readonly TrailProjectTimelineDueReadModel[];
  readonly futureSpan?: TrailProjectTimelineFutureReadModel;
  readonly historicalSpan?: TrailProjectTimelineHistoricalReadModel;
  readonly id: TrailProjectId;
  readonly statusCategory: TrailProjectStatusCategory;
  readonly statusLabel: string;
  readonly title: string;
}

export interface TrailProjectsRootReadModel {
  readonly configuration: TrailConfiguration;
  readonly emptyKind?: TrailProjectsRootEmptyKind;
  readonly groups: readonly TrailProjectsRootGroupReadModel[];
  readonly initiatives: readonly {
    readonly id: string;
    readonly title: string;
  }[];
  readonly timeline: {
    readonly projectionEmpty: boolean;
    readonly rows: readonly TrailProjectTimelineRowReadModel[];
  };
  readonly visibleProjectIds: readonly TrailProjectId[];
}

function requireInitiativeClause(
  clause: TrailCollectionFilterClause | undefined,
): TrailDiscreteFilterClause | undefined {
  if (clause === undefined) return undefined;
  if (clause.kind !== "discrete") {
    throw new Error("Initiative filter must be a discrete clause");
  }
  return clause;
}

function matchesProjectFilter(
  project: TrailProject,
  status: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  input: TrailProjectsRootReadInput,
  configuration: TrailConfiguration,
): boolean {
  if (
    input.filter.status === undefined
    && (status.category === "completed" || status.category === "canceled")
  ) {
    return false;
  }

  const initiativeClause = requireInitiativeClause(input.filter.initiative);
  if (!matchesTrailOptionalDiscreteFilter(project.initiativeId, initiativeClause)) return false;

  return matchesTrailProjectCollectionFilter(
    project,
    status,
    { filter: input.filter, now: input.now },
    configuration,
  );
}

function milestoneDerivedComplete(
  readable: TrailEffectiveRuntimeSnapshot,
  configuration: TrailConfiguration,
  milestone: TrailMilestone,
): boolean {
  const issueIds = readable.indexes.issuesByMilestoneId.get(milestone.id) ?? [];
  let completed = 0;
  let effective = 0;

  for (const issueId of issueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") {
      throw new Error(`Milestone ${milestone.id} has an unreadable child Issue ${issueId}`);
    }
    const status = requireTrailIssueStatus(configuration, issue);
    if (status.category === "canceled") continue;
    effective += 1;
    if (status.category === "completed") completed += 1;
  }

  return effective > 0 && completed === effective;
}

function dueMarker(
  kind: TrailProjectTimelineDueKind,
  id: string,
  label: string,
  timestamp: TrailTimestamp,
  now: TrailTimestamp,
): TrailProjectTimelineDueReadModel {
  return {
    id: `${kind}:${id}`,
    kind,
    label,
    overdue: timestamp < now ? true : undefined,
    timestamp,
  };
}

function eligibleDueMarkers(
  readable: TrailEffectiveRuntimeSnapshot,
  configuration: TrailConfiguration,
  project: TrailProject,
  projectStatus: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  issues: readonly TrailProjectWorkflowIssueProjection[],
  now: TrailTimestamp,
): readonly TrailProjectTimelineDueReadModel[] {
  const markers: TrailProjectTimelineDueReadModel[] = [];

  if (
    project.due !== undefined
    && (projectStatus.category === "unstarted" || projectStatus.category === "started")
  ) {
    markers.push(dueMarker(
      "project",
      project.id,
      `${project.title} due`,
      project.due,
      now,
    ));
  }

  for (const { issue, status } of issues) {
    if (
      issue.due !== undefined
      && status.category !== "completed"
      && status.category !== "canceled"
    ) {
      markers.push(dueMarker(
        "issue",
        issue.id,
        `${issue.title} due`,
        issue.due,
        now,
      ));
    }
  }

  for (const milestoneId of readable.indexes.milestonesByProjectId.get(project.id) ?? []) {
    const milestone = readable.authoritative.domain.milestonesById.get(milestoneId);
    if (milestone === undefined) {
      throw new Error(`Project ${project.id} has an unreadable Milestone ${milestoneId}`);
    }
    if (
      milestone.due !== undefined
      && !milestoneDerivedComplete(readable, configuration, milestone)
    ) {
      markers.push(dueMarker(
        "milestone",
        milestone.id,
        `${milestone.title} due`,
        milestone.due,
        now,
      ));
    }
  }

  return markers.sort((left, right) => {
    const timeOrder = left.timestamp - right.timestamp;
    return timeOrder !== 0 ? timeOrder : left.id.localeCompare(right.id);
  });
}

function latestTimestamp(values: readonly (TrailTimestamp | undefined)[]): TrailTimestamp | undefined {
  let latest: TrailTimestamp | undefined;
  for (const value of values) {
    if (value === undefined) continue;
    if (latest === undefined || value > latest) latest = value;
  }
  return latest;
}

function earliestTimestamp(values: readonly TrailTimestamp[]): TrailTimestamp {
  return Math.min(...values);
}

function historicalTimelineSpan(
  projectStatus: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  issues: readonly TrailProjectWorkflowIssueProjection[],
  dueMarkers: readonly TrailProjectTimelineDueReadModel[],
  now: TrailTimestamp,
): TrailProjectTimelineHistoricalReadModel | undefined {
  const startedIssues = issues.filter(({ issue }) => issue.firstStartedAt !== undefined);
  if (startedIssues.length > 0) {
    const start = earliestTimestamp(
      startedIssues.map(({ issue }) => issue.firstStartedAt as TrailTimestamp),
    );
    const hasOpenStartedIssue = startedIssues.some(({ status }) => (
      status.category !== "completed" && status.category !== "canceled"
    ));
    const end = hasOpenStartedIssue
      ? now
      : latestTimestamp(startedIssues.map(({ issue }) => issue.terminalAt));
    return end !== undefined && end > start
      ? { end, kind: "execution", start }
      : undefined;
  }

  const origin = earliestTimestamp(issues.map(({ issue }) => issue.createdAt));
  const allClosed = issues.every(({ status }) => (
    status.category === "completed" || status.category === "canceled"
  ));
  let end: TrailTimestamp | undefined;

  if (projectStatus.category === "started") {
    end = now;
  } else if (allClosed) {
    end = latestTimestamp(issues.map(({ issue }) => issue.terminalAt));
  } else {
    end = latestTimestamp(dueMarkers.map(({ timestamp }) => timestamp));
  }

  return end !== undefined && end > origin
    ? { end, kind: "planning", start: origin }
    : undefined;
}

function timelineRow(
  readable: TrailEffectiveRuntimeSnapshot,
  configuration: TrailConfiguration,
  project: TrailProject,
  projectStatus: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  issues: readonly TrailProjectWorkflowIssueProjection[],
  now: TrailTimestamp,
): TrailProjectTimelineRowReadModel | undefined {
  if (issues.length === 0) return undefined;

  const dueMarkers = eligibleDueMarkers(
    readable,
    configuration,
    project,
    projectStatus,
    issues,
    now,
  );
  const hasStartedIssue = issues.some(({ issue }) => issue.firstStartedAt !== undefined);
  const allClosed = issues.every(({ status }) => (
    status.category === "completed" || status.category === "canceled"
  ));
  const eligible = hasStartedIssue
    || projectStatus.category === "started"
    || dueMarkers.length > 0
    || allClosed;
  if (!eligible) return undefined;

  const latestFutureDue = latestTimestamp(
    dueMarkers
      .filter(({ timestamp }) => timestamp > now)
      .map(({ timestamp }) => timestamp),
  );

  return {
    dueMarkers,
    futureSpan: latestFutureDue === undefined
      ? undefined
      : { end: latestFutureDue, start: now },
    historicalSpan: historicalTimelineSpan(projectStatus, issues, dueMarkers, now),
    id: project.id,
    statusCategory: projectStatus.category,
    statusLabel: projectStatus.name,
    title: project.title,
  };
}

/**
 * Builds the Projects Root projection from one coherent readable Runtime snapshot.
 * Filter state and `now` remain explicit transient UI inputs. List grouping/order,
 * current-scope Progress, and Timeline eligibility/evidence are Query-owned facts.
 */
export function selectTrailProjectsRootReadModel(
  state: TrailRuntimeState,
  input: TrailProjectsRootReadInput,
): TrailProjectsRootReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const initiatives = selectTrailInitiativeTargets(readable);
  const allProjects = [...readable.authoritative.domain.projectsById.values()];
  const visibleProjects = allProjects
    .filter((project) => matchesProjectFilter(
      project,
      requireTrailProjectStatus(configuration, project),
      input,
      configuration,
    ))
    .sort((left, right) => compareTrailProjectOrder(configuration, left, right));

  const summariesById = new Map<TrailProjectId, TrailProjectSummaryReadModel>();
  const timelineRowsById = new Map<TrailProjectId, TrailProjectTimelineRowReadModel>();
  for (const project of visibleProjects) {
    const status = requireTrailProjectStatus(configuration, project);
    const issues = selectTrailWorkflowIssuesForProject(readable, configuration, project.id);
    summariesById.set(project.id, createTrailProjectSummaryReadModel(project, status, issues));
    const timeline = timelineRow(
      readable,
      configuration,
      project,
      status,
      issues,
      input.now,
    );
    if (timeline !== undefined) timelineRowsById.set(project.id, timeline);
  }

  const visibleByInitiative = new Map<string, TrailProjectSummaryReadModel[]>();
  const unassigned: TrailProjectSummaryReadModel[] = [];
  for (const project of visibleProjects) {
    const summary = summariesById.get(project.id);
    if (summary === undefined) continue;
    if (project.initiativeId === undefined) {
      unassigned.push(summary);
    } else {
      const items = visibleByInitiative.get(project.initiativeId) ?? [];
      items.push(summary);
      visibleByInitiative.set(project.initiativeId, items);
    }
  }

  const groups: TrailProjectsRootGroupReadModel[] = [];
  for (const initiative of initiatives) {
    const projects = visibleByInitiative.get(initiative.id);
    if (projects === undefined || projects.length === 0) continue;
    groups.push({ initiative, projects });
  }
  if (unassigned.length > 0) groups.push({ projects: unassigned });

  const visibleProjectIds = groups.flatMap((group) => group.projects.map(({ id }) => id));
  const timelineRows = visibleProjectIds
    .map((projectId) => timelineRowsById.get(projectId))
    .filter((row): row is TrailProjectTimelineRowReadModel => row !== undefined);
  const filterActive = isTrailCollectionFilterActive(input.filter);
  const emptyKind = allProjects.length === 0
    ? "true"
    : visibleProjectIds.length > 0
      ? undefined
      : filterActive
        ? "filtered"
        : "projection";

  return {
    configuration,
    emptyKind,
    groups,
    initiatives,
    timeline: {
      projectionEmpty: visibleProjectIds.length > 0 && timelineRows.length === 0,
      rows: timelineRows,
    },
    visibleProjectIds,
  };
}
