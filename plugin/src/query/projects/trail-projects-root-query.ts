import type { TrailConfiguration, TrailStatusDefinition } from "../../domain/model/trail-configuration";
import type {
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  TRAIL_PROJECT_STATUS_CATEGORIES,
  type TrailPriority,
  type TrailProjectId,
  type TrailProjectStatusCategory,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import type { TrailEffectiveRuntimeSnapshot } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  type TrailCollectionFilterClause,
  type TrailCollectionFilterState,
  type TrailDiscreteFilterClause,
  isTrailCollectionFilterActive,
  matchesTrailDueFilter,
  matchesTrailOptionalDiscreteFilter,
  matchesTrailSetDiscreteFilter,
} from "../shared/trail-collection-filter";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";

const PRIORITY_ORDER = new Map<TrailPriority, number>(
  TRAIL_PRIORITIES.map((priority, index) => [priority, index]),
);
const PROJECT_CATEGORY_ORDER = new Map<TrailProjectStatusCategory, number>(
  TRAIL_PROJECT_STATUS_CATEGORIES.map((category, index) => [category, index]),
);

export type TrailProjectsRootFilterPropertyId =
  | "due"
  | "initiative"
  | "labels"
  | "priority"
  | "status";
export type TrailProjectsRootFilterState = TrailCollectionFilterState<TrailProjectsRootFilterPropertyId>;
export type TrailProjectsRootEmptyKind = "filtered" | "projection" | "true";

export interface TrailProjectsRootReadInput {
  readonly filter: TrailProjectsRootFilterState;
  readonly now: TrailTimestamp;
}

export type TrailProjectProgressReadModel =
  | {
      readonly max: number;
      readonly unavailable?: false;
      readonly value: number;
    }
  | {
      readonly max?: never;
      readonly unavailable: true;
      readonly value?: never;
    };

export interface TrailProjectSummaryReadModel {
  readonly due?: TrailTimestamp;
  readonly id: TrailProjectId;
  readonly initiativeId?: string;
  readonly priority: TrailPriority | undefined;
  readonly progress: TrailProjectProgressReadModel;
  readonly statusCategory: TrailProjectStatusCategory;
  readonly statusLabel: string;
  readonly title: string;
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

interface TrailWorkflowIssueProjection {
  readonly issue: TrailWorkflowIssue;
  readonly status: TrailStatusDefinition;
}

function priorityOrder(priority: TrailPriority | undefined): number {
  return priority === undefined
    ? TRAIL_PRIORITIES.length
    : PRIORITY_ORDER.get(priority) ?? TRAIL_PRIORITIES.length;
}

function requireDiscreteClause(
  clause: TrailCollectionFilterClause | undefined,
  property: "Initiative" | "Labels" | "Priority" | "Status",
): TrailDiscreteFilterClause | undefined {
  if (clause === undefined) return undefined;
  if (clause.kind !== "discrete") {
    throw new Error(`${property} filter must be a discrete clause`);
  }
  return clause;
}

function requireProjectStatus(
  configuration: TrailConfiguration,
  project: TrailProject,
): TrailStatusDefinition & { readonly category: TrailProjectStatusCategory } {
  const status = resolveTrailStatusDefinition(
    configuration,
    "project",
    project.statusDefinitionId,
  );
  if (
    status === undefined
    || !TRAIL_PROJECT_STATUS_CATEGORIES.includes(status.category as TrailProjectStatusCategory)
  ) {
    throw new Error(`Project ${project.id} has no readable Project StatusDefinition`);
  }
  return status as TrailStatusDefinition & { readonly category: TrailProjectStatusCategory };
}

function requireIssueStatus(
  configuration: TrailConfiguration,
  issue: TrailWorkflowIssue,
): TrailStatusDefinition {
  const status = resolveTrailStatusDefinition(
    configuration,
    "issue",
    issue.statusDefinitionId,
  );
  if (status === undefined) {
    throw new Error(`Issue ${issue.id} has no readable Issue StatusDefinition`);
  }
  return status;
}

function projectStatusOrder(
  configuration: TrailConfiguration,
  status: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
): readonly [number, number] {
  const categoryOrder = PROJECT_CATEGORY_ORDER.get(status.category)
    ?? TRAIL_PROJECT_STATUS_CATEGORIES.length;
  const definitionIds = configuration.workflowStatuses.project[status.category].definitionIds;
  const definitionOrder = definitionIds.indexOf(status.id);
  return [
    categoryOrder,
    definitionOrder < 0 ? definitionIds.length : definitionOrder,
  ];
}

function compareOptionalDue(left: TrailTimestamp | undefined, right: TrailTimestamp | undefined): number {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}

function compareProjectOrder(
  configuration: TrailConfiguration,
  left: TrailProject,
  right: TrailProject,
): number {
  const leftStatus = requireProjectStatus(configuration, left);
  const rightStatus = requireProjectStatus(configuration, right);
  const leftTerminal = leftStatus.category === "completed" || leftStatus.category === "canceled";
  const rightTerminal = rightStatus.category === "completed" || rightStatus.category === "canceled";
  if (leftTerminal !== rightTerminal) return leftTerminal ? 1 : -1;

  const dueOrder = compareOptionalDue(left.due, right.due);
  if (dueOrder !== 0) return dueOrder;

  const leftStatusOrder = projectStatusOrder(configuration, leftStatus);
  const rightStatusOrder = projectStatusOrder(configuration, rightStatus);
  const categoryOrder = leftStatusOrder[0] - rightStatusOrder[0];
  if (categoryOrder !== 0) return categoryOrder;
  const definitionOrder = leftStatusOrder[1] - rightStatusOrder[1];
  if (definitionOrder !== 0) return definitionOrder;

  const priorityDelta = priorityOrder(left.priority) - priorityOrder(right.priority);
  return priorityDelta !== 0 ? priorityDelta : left.id.localeCompare(right.id);
}

function matchesProjectFilter(
  project: TrailProject,
  status: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  input: TrailProjectsRootReadInput,
  configuration: TrailConfiguration,
): boolean {
  const statusClause = requireDiscreteClause(input.filter.status, "Status");
  if (statusClause === undefined) {
    if (status.category === "completed" || status.category === "canceled") return false;
  } else if (!matchesTrailOptionalDiscreteFilter(project.statusDefinitionId, statusClause)) {
    return false;
  }

  const initiativeClause = requireDiscreteClause(input.filter.initiative, "Initiative");
  if (!matchesTrailOptionalDiscreteFilter(project.initiativeId, initiativeClause)) return false;

  const priorityClause = requireDiscreteClause(input.filter.priority, "Priority");
  if (!matchesTrailOptionalDiscreteFilter(project.priority, priorityClause)) return false;

  const labelClause = requireDiscreteClause(input.filter.labels, "Labels");
  if (!matchesTrailSetDiscreteFilter(project.labelIds, labelClause)) return false;

  const dueClause = input.filter.due;
  if (dueClause !== undefined) {
    if (dueClause.kind !== "due") throw new Error("Due filter must be a Due clause");
    if (
      project.due === undefined
      || !matchesTrailDueFilter(
        project.due,
        dueClause.value,
        input.now,
        configuration.temporal.timezone,
      )
    ) {
      return false;
    }
  }

  return true;
}

function workflowIssuesForProject(
  readable: TrailEffectiveRuntimeSnapshot,
  configuration: TrailConfiguration,
  projectId: TrailProjectId,
): readonly TrailWorkflowIssueProjection[] {
  return (readable.indexes.issuesByProjectId.get(projectId) ?? []).map((issueId) => {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") {
      throw new Error(`Project ${projectId} has an unreadable child Issue ${issueId}`);
    }
    return {
      issue,
      status: requireIssueStatus(configuration, issue),
    };
  });
}

function projectProgress(
  issues: readonly TrailWorkflowIssueProjection[],
): TrailProjectProgressReadModel {
  let completed = 0;
  let effective = 0;

  for (const { status } of issues) {
    if (status.category === "canceled") continue;
    effective += 1;
    if (status.category === "completed") completed += 1;
  }

  return effective === 0
    ? { unavailable: true }
    : { max: effective, value: completed };
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
    const status = requireIssueStatus(configuration, issue);
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
  issues: readonly TrailWorkflowIssueProjection[],
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
  issues: readonly TrailWorkflowIssueProjection[],
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
  issues: readonly TrailWorkflowIssueProjection[],
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

function initiativeOrder(left: TrailInitiative, right: TrailInitiative): number {
  const titleOrder = left.title.localeCompare(right.title);
  return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
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

  const initiatives = [...readable.authoritative.domain.initiativesById.values()]
    .sort(initiativeOrder)
    .map(({ id, title }) => ({ id, title }));
  const allProjects = [...readable.authoritative.domain.projectsById.values()];
  const visibleProjects = allProjects
    .filter((project) => matchesProjectFilter(
      project,
      requireProjectStatus(configuration, project),
      input,
      configuration,
    ))
    .sort((left, right) => compareProjectOrder(configuration, left, right));

  const summariesById = new Map<TrailProjectId, TrailProjectSummaryReadModel>();
  const timelineRowsById = new Map<TrailProjectId, TrailProjectTimelineRowReadModel>();
  for (const project of visibleProjects) {
    const status = requireProjectStatus(configuration, project);
    const issues = workflowIssuesForProject(readable, configuration, project.id);
    summariesById.set(project.id, {
      due: project.due,
      id: project.id,
      initiativeId: project.initiativeId,
      priority: project.priority,
      progress: projectProgress(issues),
      statusCategory: status.category,
      statusLabel: status.name,
      title: project.title,
    });
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
