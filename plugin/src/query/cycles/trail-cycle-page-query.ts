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

export interface TrailCurrentCyclePageReadModel {
  readonly configuration: TrailConfiguration;
  readonly cycle: TrailCurrentCycleSummaryReadModel;
  readonly history: readonly TrailCycleHistoryItemReadModel[];
  readonly kind: "current";
  readonly sections: readonly TrailCycleStatusSectionReadModel[];
  readonly visibleIssueIds: readonly string[];
}

export interface TrailHistoricalCyclePageReadModel {
  readonly configuration: TrailConfiguration;
  readonly cycle: TrailHistoricalCycleSummaryReadModel;
  readonly history: readonly TrailCycleHistoryItemReadModel[];
  readonly issues: readonly TrailWorkflowIssuePresentationReadModel[];
  readonly kind: "historical";
  readonly visibleIssueIds: readonly string[];
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
  const presentations: TrailWorkflowIssuePresentationReadModel[] = [];
  for (const issue of sortedIssues) {
    const presentation = projectIssuePresentation(issue);
    if (presentation === null) return null;
    presentations.push(presentation);
  }

  const history = cycleHistory(readable);
  if (cycle.endedAt !== undefined) {
    return {
      configuration,
      cycle: historicalCycleSummary(configuration, cycle, cycle.endedAt, issues),
      history,
      issues: presentations,
      kind: "historical",
      visibleIssueIds: presentations.map((issue) => issue.id),
    };
  }

  const summary = currentCycleSummary(configuration, cycle, issues);
  if (summary === null) return null;

  const sections = selectTrailWorkflowIssueListStatusGroups(configuration)
    .flatMap((group) => group.definitions.map((definition) => ({
      category: group.category,
      id: definition.id,
      issues: presentations.filter((issue) => issue.status.id === definition.id),
      label: definition.name,
    })));

  return {
    configuration,
    cycle: summary,
    history,
    kind: "current",
    sections,
    visibleIssueIds: sections.flatMap((section) => section.issues.map((issue) => issue.id)),
  };
}
