import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailCycle,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import type {
  TrailStatusCategory,
  TrailTimestamp,
} from "../../domain/model/trail-values";
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
import {
  selectTrailWorkflowIssueProgress,
  type TrailProgressReadModel,
} from "../shared/trail-progress-query";
import {
  compareTrailWorkflowIssueCollectionOrder,
  selectTrailWorkflowIssueListStatusGroups,
} from "../shared/trail-workflow-issue-collection-query";
import {
  createTrailWorkflowIssuePresentationProjector,
  type TrailWorkflowIssuePresentationReadModel,
} from "../shared/trail-workflow-issue-presentation-query";
import { selectTrailClosedCyclesFromReadableSnapshot } from "./trail-cycle-query";

export type TrailCycleFilterPropertyId =
  | "due"
  | "estimate"
  | "labels"
  | "milestone"
  | "priority"
  | "project"
  | "status";

export type TrailCycleFilterState = TrailCollectionFilterState<TrailCycleFilterPropertyId>;

export interface TrailCyclePageReadInput {
  readonly filter: TrailCycleFilterState;
  readonly now: TrailTimestamp;
}

export interface TrailCycleNamedTargetReadModel {
  readonly id: string;
  readonly title: string;
}

export interface TrailCycleProjectReadModel extends TrailCycleNamedTargetReadModel {
  readonly issueCount: number;
}

export interface TrailCycleHistoryItemReadModel {
  readonly endedAt: TrailTimestamp;
  readonly id: string;
  readonly issueCount: number;
  readonly plannedEnd: TrailTimestamp;
  readonly startedAt: TrailTimestamp;
}

export interface TrailCycleStatusSectionReadModel {
  readonly category: TrailStatusCategory;
  readonly id: string;
  readonly issues: readonly TrailWorkflowIssuePresentationReadModel[];
  readonly label: string;
}

export interface TrailCycleSummaryReadModel {
  readonly effort: number;
  readonly id: string;
  readonly issueCount: number;
  readonly plannedEnd: TrailTimestamp;
  readonly startedAt: TrailTimestamp;
}

export interface TrailCurrentCycleSummaryReadModel extends TrailCycleSummaryReadModel {
  readonly progress: TrailProgressReadModel;
}

export interface TrailHistoricalCycleSummaryReadModel extends TrailCycleSummaryReadModel {
  readonly endedAt: TrailTimestamp;
}

interface TrailCyclePageReadModelBase {
  readonly configuration: TrailConfiguration;
  readonly expectedCycle: TrailCycle;
  readonly emptyKind?: "filtered" | "true";
  readonly history: readonly TrailCycleHistoryItemReadModel[];
  readonly milestones: readonly TrailCycleNamedTargetReadModel[];
  readonly projects: readonly TrailCycleProjectReadModel[];
  readonly visibleIssueIds: readonly string[];
}

export interface TrailCurrentCyclePageReadModel extends TrailCyclePageReadModelBase {
  readonly cycle: TrailCurrentCycleSummaryReadModel;
  readonly kind: "current";
  readonly sections: readonly TrailCycleStatusSectionReadModel[];
}

export interface TrailHistoricalCyclePageReadModel extends TrailCyclePageReadModelBase {
  readonly cycle: TrailHistoricalCycleSummaryReadModel;
  readonly issues: readonly TrailWorkflowIssuePresentationReadModel[];
  readonly kind: "historical";
}

export type TrailCyclePageReadModel =
  | TrailCurrentCyclePageReadModel
  | TrailHistoricalCyclePageReadModel;

export interface TrailCyclesIndexReadModel {
  readonly configuration: TrailConfiguration;
  readonly current?: TrailCurrentCycleSummaryReadModel;
  readonly history: readonly TrailCycleHistoryItemReadModel[];
}

function cycleHistory(
  readable: TrailEffectiveRuntimeSnapshot,
): readonly TrailCycleHistoryItemReadModel[] {
  return selectTrailClosedCyclesFromReadableSnapshot(readable).map((cycle) => ({
    endedAt: cycle.endedAt,
    id: cycle.id,
    issueCount: cycle.issueIds.length,
    plannedEnd: cycle.plannedEnd,
    startedAt: cycle.startedAt,
  }));
}

function cycleIssues(
  readable: TrailEffectiveRuntimeSnapshot,
  cycle: TrailCycle,
): readonly TrailWorkflowIssue[] | null {
  const issues: TrailWorkflowIssue[] = [];
  for (const issueId of cycle.issueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context !== "workflow") return null;
    issues.push(issue);
  }
  return issues;
}

function cycleEffort(
  configuration: TrailConfiguration,
  issues: readonly TrailWorkflowIssue[],
): number {
  return issues.reduce((total, issue) => (
    issue.estimate === undefined
      ? total
      : total + configuration.estimateWeights[issue.estimate]
  ), 0);
}

function cycleSummary(
  configuration: TrailConfiguration,
  cycle: TrailCycle,
  issues: readonly TrailWorkflowIssue[],
): TrailCycleSummaryReadModel {
  return {
    effort: cycleEffort(configuration, issues),
    id: cycle.id,
    issueCount: cycle.issueIds.length,
    plannedEnd: cycle.plannedEnd,
    startedAt: cycle.startedAt,
  };
}

function currentCycleSummary(
  configuration: TrailConfiguration,
  cycle: TrailCycle,
  issues: readonly TrailWorkflowIssue[],
): TrailCurrentCycleSummaryReadModel | null {
  if (cycle.endedAt !== undefined) return null;
  const progress = selectTrailWorkflowIssueProgress(configuration, issues);
  if (progress === null) return null;
  return {
    ...cycleSummary(configuration, cycle, issues),
    progress,
  };
}

function historicalCycleSummary(
  configuration: TrailConfiguration,
  cycle: TrailCycle,
  endedAt: TrailTimestamp,
  issues: readonly TrailWorkflowIssue[],
): TrailHistoricalCycleSummaryReadModel {
  return {
    ...cycleSummary(configuration, cycle, issues),
    endedAt,
  };
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

function matchesCycleFilter(
  issue: TrailWorkflowIssue,
  filter: TrailCycleFilterState,
  now: TrailTimestamp,
  timezone: string,
): boolean {
  const statusClause = requireDiscreteClause(filter.status, "Status");
  if (!matchesTrailOptionalDiscreteFilter(issue.statusDefinitionId, statusClause)) return false;

  const projectClause = requireDiscreteClause(filter.project, "Project");
  if (!matchesTrailOptionalDiscreteFilter(issue.projectId, projectClause)) return false;

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

function cycleProjects(
  allIssues: readonly TrailWorkflowIssuePresentationReadModel[],
  visibleIssueIds: ReadonlySet<string>,
): readonly TrailCycleProjectReadModel[] {
  const projects = new Map<string, TrailCycleNamedTargetReadModel>();
  const visibleCounts = new Map<string, number>();

  for (const issue of allIssues) {
    projects.set(issue.project.id, issue.project);
    if (visibleIssueIds.has(issue.id)) {
      visibleCounts.set(issue.project.id, (visibleCounts.get(issue.project.id) ?? 0) + 1);
    }
  }

  return [...projects.values()]
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map((project) => ({
      ...project,
      issueCount: visibleCounts.get(project.id) ?? 0,
    }));
}

function cycleMilestones(
  issues: readonly TrailWorkflowIssuePresentationReadModel[],
): readonly TrailCycleNamedTargetReadModel[] {
  const milestones = new Map<string, TrailCycleNamedTargetReadModel>();
  for (const issue of issues) {
    if (issue.milestone !== undefined) milestones.set(issue.milestone.id, issue.milestone);
  }
  return [...milestones.values()].sort((left, right) => {
    const titleOrder = left.title.localeCompare(right.title);
    return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
  });
}

export function selectTrailCyclesIndexReadModel(
  state: TrailRuntimeState,
): TrailCyclesIndexReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const currentCycleId = readable.indexes.currentCycleId;
  const currentCycle = currentCycleId === undefined
    ? undefined
    : readable.authoritative.domain.cyclesById.get(currentCycleId);
  if (currentCycleId !== undefined && currentCycle === undefined) return null;

  let current: TrailCurrentCycleSummaryReadModel | undefined;
  if (currentCycle !== undefined) {
    const issues = cycleIssues(readable, currentCycle);
    if (issues === null) return null;
    const summary = currentCycleSummary(configuration, currentCycle, issues);
    if (summary === null) return null;
    current = summary;
  }

  return {
    configuration,
    current,
    history: cycleHistory(readable),
  };
}

export function selectTrailCyclePageReadModel(
  state: TrailRuntimeState,
  cycleId: string,
  input?: TrailCyclePageReadInput,
): TrailCyclePageReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const cycle = readable.authoritative.domain.cyclesById.get(cycleId);
  if (cycle === undefined) return null;
  const issues = cycleIssues(readable, cycle);
  if (issues === null) return null;

  const sortedIssues = [...issues].sort(compareTrailWorkflowIssueCollectionOrder);
  const projectIssuePresentation = createTrailWorkflowIssuePresentationProjector(readable);
  if (projectIssuePresentation === null) return null;
  const allPresentations: TrailWorkflowIssuePresentationReadModel[] = [];
  for (const issue of sortedIssues) {
    const presentation = projectIssuePresentation(issue);
    if (presentation === null) return null;
    allPresentations.push(presentation);
  }

  const visibleIssues = input === undefined
    ? sortedIssues
    : sortedIssues.filter((issue) => matchesCycleFilter(
        issue,
        input.filter,
        input.now,
        configuration.temporal.timezone,
      ));
  const visibleIds = new Set(visibleIssues.map(({ id }) => id));
  const visiblePresentations = allPresentations.filter(({ id }) => visibleIds.has(id));
  const activeFilter = input === undefined ? false : isTrailCollectionFilterActive(input.filter);
  const emptyKind = issues.length === 0
    ? "true" as const
    : visibleIssues.length === 0 && activeFilter
      ? "filtered" as const
      : undefined;
  const projects = cycleProjects(allPresentations, visibleIds);
  const milestones = cycleMilestones(allPresentations);
  const history = cycleHistory(readable);

  if (cycle.endedAt !== undefined) {
    return {
      configuration,
      cycle: historicalCycleSummary(configuration, cycle, cycle.endedAt, issues),
      emptyKind,
      expectedCycle: cycle,
      history,
      issues: visiblePresentations,
      kind: "historical",
      milestones,
      projects,
      visibleIssueIds: visiblePresentations.map((issue) => issue.id),
    };
  }

  const summary = currentCycleSummary(configuration, cycle, issues);
  if (summary === null) return null;

  const sections = selectTrailWorkflowIssueListStatusGroups(configuration)
    .flatMap((group) => group.definitions.map((definition) => ({
      category: group.category,
      id: definition.id,
      issues: visiblePresentations.filter((issue) => issue.status.id === definition.id),
      label: definition.name,
    })));

  return {
    configuration,
    cycle: summary,
    emptyKind,
    expectedCycle: cycle,
    history,
    kind: "current",
    milestones,
    projects,
    sections,
    visibleIssueIds: sections.flatMap((section) => section.issues.map((issue) => issue.id)),
  };
}
