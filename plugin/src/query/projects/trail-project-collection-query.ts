import type { TrailConfiguration, TrailStatusDefinition } from "../../domain/model/trail-configuration";
import type {
  TrailInitiative,
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
import {
  type TrailCollectionFilterClause,
  type TrailCollectionFilterState,
  type TrailDiscreteFilterClause,
  matchesTrailDueFilter,
  matchesTrailOptionalDiscreteFilter,
  matchesTrailSetDiscreteFilter,
} from "../shared/trail-collection-filter";

const PRIORITY_ORDER = new Map<TrailPriority, number>(
  TRAIL_PRIORITIES.map((priority, index) => [priority, index]),
);
const PROJECT_CATEGORY_ORDER = new Map<TrailProjectStatusCategory, number>(
  TRAIL_PROJECT_STATUS_CATEGORIES.map((category, index) => [category, index]),
);

export type TrailProjectCollectionFilterPropertyId =
  | "due"
  | "labels"
  | "priority"
  | "status";
export type TrailProjectCollectionFilterState =
  TrailCollectionFilterState<TrailProjectCollectionFilterPropertyId>;

export interface TrailProjectCollectionFilterInput {
  readonly filter: TrailProjectCollectionFilterState;
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

export interface TrailProjectWorkflowIssueProjection {
  readonly issue: TrailWorkflowIssue;
  readonly status: TrailStatusDefinition;
}

export interface TrailInitiativeTargetReadModel {
  readonly id: string;
  readonly title: string;
}

function priorityOrder(priority: TrailPriority | undefined): number {
  return priority === undefined
    ? TRAIL_PRIORITIES.length
    : PRIORITY_ORDER.get(priority) ?? TRAIL_PRIORITIES.length;
}

function requireDiscreteClause(
  clause: TrailCollectionFilterClause | undefined,
  property: "Labels" | "Priority" | "Status",
): TrailDiscreteFilterClause | undefined {
  if (clause === undefined) return undefined;
  if (clause.kind !== "discrete") {
    throw new Error(`${property} filter must be a discrete clause`);
  }
  return clause;
}

export function requireTrailProjectStatus(
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

export function requireTrailIssueStatus(
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

function compareOptionalDue(
  left: TrailTimestamp | undefined,
  right: TrailTimestamp | undefined,
): number {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}

export function compareTrailProjectOrder(
  configuration: TrailConfiguration,
  left: TrailProject,
  right: TrailProject,
): number {
  const leftStatus = requireTrailProjectStatus(configuration, left);
  const rightStatus = requireTrailProjectStatus(configuration, right);
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

export function matchesTrailProjectCollectionFilter(
  project: TrailProject,
  status: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  input: TrailProjectCollectionFilterInput,
  configuration: TrailConfiguration,
): boolean {
  const statusClause = requireDiscreteClause(input.filter.status, "Status");
  if (!matchesTrailOptionalDiscreteFilter(status.id, statusClause)) return false;

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

export function selectTrailWorkflowIssuesForProject(
  readable: TrailEffectiveRuntimeSnapshot,
  configuration: TrailConfiguration,
  projectId: TrailProjectId,
): readonly TrailProjectWorkflowIssueProjection[] {
  return (readable.indexes.issuesByProjectId.get(projectId) ?? []).map((issueId) => {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") {
      throw new Error(`Project ${projectId} has an unreadable child Issue ${issueId}`);
    }
    return {
      issue,
      status: requireTrailIssueStatus(configuration, issue),
    };
  });
}

function projectProgress(
  issues: readonly TrailProjectWorkflowIssueProjection[],
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

export function createTrailProjectSummaryReadModel(
  project: TrailProject,
  status: TrailStatusDefinition & { readonly category: TrailProjectStatusCategory },
  issues: readonly TrailProjectWorkflowIssueProjection[],
): TrailProjectSummaryReadModel {
  return {
    due: project.due,
    id: project.id,
    initiativeId: project.initiativeId,
    priority: project.priority,
    progress: projectProgress(issues),
    statusCategory: status.category,
    statusLabel: status.name,
    title: project.title,
  };
}

function initiativeOrder(left: TrailInitiative, right: TrailInitiative): number {
  const titleOrder = left.title.localeCompare(right.title);
  return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
}

export function selectTrailInitiativeTargets(
  readable: TrailEffectiveRuntimeSnapshot,
): readonly TrailInitiativeTargetReadModel[] {
  return [...readable.authoritative.domain.initiativesById.values()]
    .sort(initiativeOrder)
    .map(({ id, title }) => ({ id, title }));
}
