import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailInitiative,
  TrailMilestone,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  type TrailPriority,
  type TrailProjectStatusCategory,
  type TrailStatusCategory,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import { canTrailProjectAcceptWorkflowIssue } from "../../domain/rules/trail-project-rules";
import { resolveTrailDefaultStatusDefinition } from "../../domain/rules/trail-status-rules";
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
import { selectTrailWorkflowIssueCreationProjectsFromReadableSnapshot } from "../shared/trail-project-target-query";
import { selectTrailStatusOptionGroups } from "../shared/trail-status-query";
import {
  createTrailWorkflowIssuePresentationProjector,
  type TrailWorkflowIssuePresentationReadModel,
} from "../shared/trail-workflow-issue-presentation-query";
import { requireTrailProjectStatus } from "./trail-project-collection-query";

export type TrailProjectWorkspaceFilterPropertyId =
  | "due"
  | "estimate"
  | "labels"
  | "milestone"
  | "priority"
  | "status";

export type TrailProjectWorkspaceFilterState = TrailCollectionFilterState<
  TrailProjectWorkspaceFilterPropertyId
>;

const TRAIL_PROJECT_WORKSPACE_LIST_STATUS_CATEGORY_ORDER = [
  "started",
  "unstarted",
  "backlog",
  "completed",
  "canceled",
] as const satisfies readonly TrailStatusCategory[];

export interface TrailProjectWorkspaceReadInput {
  readonly filter: TrailProjectWorkspaceFilterState;
  readonly now: TrailTimestamp;
  readonly projectId: string;
}

export interface TrailProjectWorkspaceNamedTargetReadModel {
  readonly id: string;
  readonly title: string;
}

export interface TrailProjectWorkspaceCreationTargetReadModel
  extends TrailProjectWorkspaceNamedTargetReadModel {
  readonly milestones: readonly TrailProjectWorkspaceNamedTargetReadModel[];
}

export type TrailWorkflowIssueSummaryReadModel = TrailWorkflowIssuePresentationReadModel;

export interface TrailProjectWorkspaceStatusSectionReadModel {
  readonly category: TrailStatusCategory;
  readonly id: string;
  readonly issues: readonly TrailWorkflowIssueSummaryReadModel[];
  readonly label: string;
}

export interface TrailProjectWorkspaceReadModel {
  readonly canCreateIssue: boolean;
  readonly configuration: TrailConfiguration;
  readonly creationTargets: readonly TrailProjectWorkspaceCreationTargetReadModel[];
  readonly emptyKind?: "filtered" | "true";
  readonly initiative?: TrailProjectWorkspaceNamedTargetReadModel;
  readonly milestones: readonly TrailProjectWorkspaceNamedTargetReadModel[];
  readonly project: {
    readonly description?: string;
    readonly id: string;
    readonly statusCategory: TrailProjectStatusCategory;
    readonly statusLabel: string;
    readonly title: string;
  };
  readonly sections: readonly TrailProjectWorkspaceStatusSectionReadModel[];
  readonly visibleIssueIds: readonly string[];
}

function requireDiscreteClause(
  clause: TrailCollectionFilterClause | undefined,
  property: string,
): TrailDiscreteFilterClause | undefined {
  if (clause === undefined) return undefined;
  if (clause.kind !== "discrete") {
    throw new Error(`${property} filter must be a discrete clause`);
  }
  return clause;
}

function priorityOrder(priority: TrailPriority | undefined): number {
  if (priority === undefined) return TRAIL_PRIORITIES.length;
  const index = TRAIL_PRIORITIES.indexOf(priority);
  return index < 0 ? TRAIL_PRIORITIES.length : index;
}

function compareIssueOrder(left: TrailWorkflowIssue, right: TrailWorkflowIssue): number {
  const leftDue = left.due ?? Number.POSITIVE_INFINITY;
  const rightDue = right.due ?? Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;

  const priorityDelta = priorityOrder(left.priority) - priorityOrder(right.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const createdDelta = left.createdAt - right.createdAt;
  return createdDelta !== 0 ? createdDelta : left.id.localeCompare(right.id);
}

function matchesProjectWorkspaceFilter(
  issue: TrailWorkflowIssue,
  filter: TrailProjectWorkspaceFilterState,
  now: TrailTimestamp,
  timezone: string,
): boolean {
  const statusClause = requireDiscreteClause(filter.status, "Status");
  if (!matchesTrailOptionalDiscreteFilter(issue.statusDefinitionId, statusClause)) return false;

  const priorityClause = requireDiscreteClause(filter.priority, "Priority");
  if (!matchesTrailOptionalDiscreteFilter(issue.priority, priorityClause)) return false;

  const milestoneClause = requireDiscreteClause(filter.milestone, "Milestone");
  if (!matchesTrailOptionalDiscreteFilter(issue.milestoneId, milestoneClause)) return false;

  const labelClause = requireDiscreteClause(filter.labels, "Labels");
  if (!matchesTrailSetDiscreteFilter(issue.labelIds, labelClause)) return false;

  const estimateClause = requireDiscreteClause(filter.estimate, "Estimate");
  if (!matchesTrailOptionalDiscreteFilter(issue.estimate, estimateClause)) return false;

  const dueClause = filter.due;
  if (dueClause !== undefined) {
    if (dueClause.kind !== "due") throw new Error("Due filter must be a Due clause");
    if (issue.due === undefined) return false;
    if (!matchesTrailDueFilter(issue.due, dueClause.value, now, timezone)) return false;
  }

  return true;
}

function namedInitiative(initiative: TrailInitiative | undefined) {
  return initiative === undefined
    ? undefined
    : { id: initiative.id, title: initiative.title };
}

function namedMilestone(milestone: TrailMilestone) {
  return { id: milestone.id, title: milestone.title };
}

function milestoneTargets(
  projectId: string,
  readable: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
): readonly TrailProjectWorkspaceNamedTargetReadModel[] {
  return (readable.indexes.milestonesByProjectId.get(projectId) ?? [])
    .map((milestoneId) => readable.authoritative.domain.milestonesById.get(milestoneId))
    .filter((milestone): milestone is TrailMilestone => milestone !== undefined)
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map(namedMilestone);
}

function creationTargets(
  readable: ReturnType<typeof selectTrailReadableRuntimeSnapshot>,
): readonly TrailProjectWorkspaceCreationTargetReadModel[] {
  return selectTrailWorkflowIssueCreationProjectsFromReadableSnapshot(readable).map((project) => ({
    id: project.id,
    milestones: milestoneTargets(project.id, readable),
    title: project.title,
  }));
}

export function selectTrailProjectWorkspaceReadModel(
  state: TrailRuntimeState,
  input: TrailProjectWorkspaceReadInput,
): TrailProjectWorkspaceReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const project = readable.authoritative.domain.projectsById.get(input.projectId);
  if (project === undefined) return null;
  const projectStatus = requireTrailProjectStatus(configuration, project);

  const backlogStatus = resolveTrailDefaultStatusDefinition(configuration, "issue", "backlog");
  const allIssues: TrailWorkflowIssue[] = [];
  for (const issueId of readable.indexes.issuesByProjectId.get(project.id) ?? []) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context === "workflow") allIssues.push(issue);
  }

  const statusOptionGroups = selectTrailStatusOptionGroups(configuration, "issue");
  const listStatusOptionGroups = [...statusOptionGroups].sort((left, right) => (
    TRAIL_PROJECT_WORKSPACE_LIST_STATUS_CATEGORY_ORDER.indexOf(left.category)
    - TRAIL_PROJECT_WORKSPACE_LIST_STATUS_CATEGORY_ORDER.indexOf(right.category)
  ));
  const statusIds = new Set(
    statusOptionGroups.flatMap((group) => group.definitions.map((definition) => definition.id)),
  );
  if (allIssues.some((issue) => !statusIds.has(issue.statusDefinitionId))) return null;

  const visibleIssues = allIssues
    .filter((issue) => matchesProjectWorkspaceFilter(
      issue,
      input.filter,
      input.now,
      configuration.temporal.timezone,
    ))
    .sort(compareIssueOrder);
  const projectIssuePresentation = createTrailWorkflowIssuePresentationProjector(readable);
  if (projectIssuePresentation === null) return null;
  const visiblePresentations: TrailWorkflowIssuePresentationReadModel[] = [];
  for (const issue of visibleIssues) {
    const presentation = projectIssuePresentation(issue);
    if (presentation === null) return null;
    visiblePresentations.push(presentation);
  }

  const sections = listStatusOptionGroups.flatMap((group) => group.definitions.map((definition) => ({
    category: group.category,
    id: definition.id,
    issues: visiblePresentations.filter((issue) => issue.status.id === definition.id),
    label: definition.name,
  })));

  const visibleIssueIds = sections.flatMap((section) => section.issues.map((issue) => issue.id));

  const initiative = project.initiativeId === undefined
    ? undefined
    : readable.authoritative.domain.initiativesById.get(project.initiativeId);
  const activeFilter = isTrailCollectionFilterActive(input.filter);

  return {
    canCreateIssue: canTrailProjectAcceptWorkflowIssue(projectStatus, backlogStatus),
    configuration,
    creationTargets: creationTargets(readable),
    emptyKind: allIssues.length === 0
      ? "true"
      : visibleIssues.length === 0 && activeFilter
        ? "filtered"
        : undefined,
    initiative: namedInitiative(initiative),
    milestones: milestoneTargets(project.id, readable),
    project: {
      description: project.description,
      id: project.id,
      statusCategory: projectStatus.category,
      statusLabel: projectStatus.name,
      title: project.title,
    },
    sections,
    visibleIssueIds,
  };
}
