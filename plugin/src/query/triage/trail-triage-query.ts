import type {
  TrailConfiguration,
  TrailLabel,
} from "../../domain/model/trail-configuration";
import type {
  TrailMilestone,
  TrailTriageIssue,
} from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  type TrailPriority,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import { addTrailCalendarDays } from "../../domain/rules/trail-temporal-rules";
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
import {
  selectTrailReadableRuntimeSnapshot,
  selectTrailTriageIssueIdsFromReadableSnapshot,
} from "../shared/trail-effective-query";
import {
  selectTrailDefaultTriageAcceptProjectIdFromReadableSnapshot,
  selectTrailTriageAcceptProjectsFromReadableSnapshot,
} from "../shared/trail-project-target-query";

const TRAIL_TRIAGE_REVIEW_HORIZON_DAYS = 7;
const TRAIL_TRIAGE_MIN_REVIEW_SET_SIZE = 10;

export type TrailTriageFilterPropertyId = "due" | "labels" | "priority";
export type TrailTriageFilterState = TrailCollectionFilterState<TrailTriageFilterPropertyId>;
export type TrailTriageOrdering = "priority" | "review-due";

export interface TrailTriagePageReadInput {
  readonly filter: TrailTriageFilterState;
  readonly now: TrailTimestamp;
  readonly ordering: TrailTriageOrdering;
}

export interface TrailTriageQueueItemReadModel {
  readonly due: TrailTimestamp;
  readonly id: string;
  readonly labels: readonly TrailLabel[];
  readonly priority: TrailPriority | undefined;
  readonly title: string;
}

export interface TrailTriageNamedTargetReadModel {
  readonly id: string;
  readonly title: string;
}

export interface TrailTriageAcceptProjectTargetReadModel extends TrailTriageNamedTargetReadModel {
  readonly milestones: readonly TrailTriageNamedTargetReadModel[];
}

export interface TrailTriagePageReadModel {
  readonly accept: {
    readonly issue: {
      readonly defaultProjectId?: string;
      readonly projects: readonly TrailTriageAcceptProjectTargetReadModel[];
    };
    readonly project: {
      readonly initiatives: readonly TrailTriageNamedTargetReadModel[];
    };
  };
  readonly configuration: TrailConfiguration;
  readonly filteredEmpty: boolean;
  readonly queue: readonly TrailTriageQueueItemReadModel[];
  readonly reviewSet: {
    readonly boundaryAfterIssueId?: string;
    readonly count: number;
    readonly needsGlobalQualifier: boolean;
  };
  readonly visibleIssueIds: readonly string[];
}

function priorityOrder(priority: TrailPriority | undefined): number {
  if (priority === undefined) return TRAIL_PRIORITIES.length;
  const index = TRAIL_PRIORITIES.indexOf(priority);
  return index < 0 ? TRAIL_PRIORITIES.length : index;
}

function requireDiscreteClause(
  clause: TrailCollectionFilterClause | undefined,
  property: "Labels" | "Priority",
): TrailDiscreteFilterClause | undefined {
  if (clause === undefined) return undefined;
  if (clause.kind !== "discrete") {
    throw new Error(`${property} filter must be a discrete clause`);
  }
  return clause;
}

function matchesTriageFilter(
  issue: TrailTriageIssue,
  filter: TrailTriageFilterState,
  now: TrailTimestamp,
  timezone: string,
): boolean {
  const dueClause = filter.due;
  if (dueClause !== undefined) {
    if (dueClause.kind !== "due") throw new Error("Due filter must be a Due clause");
    if (!matchesTrailDueFilter(issue.due, dueClause.value, now, timezone)) return false;
  }

  const priorityClause = requireDiscreteClause(filter.priority, "Priority");
  if (!matchesTrailOptionalDiscreteFilter(issue.priority, priorityClause)) return false;

  const labelClause = requireDiscreteClause(filter.labels, "Labels");
  return matchesTrailSetDiscreteFilter(issue.labelIds, labelClause);
}

function visibleTriageIssuesFromSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
  orderedIssueIds: readonly string[],
  input: TrailTriagePageReadInput,
): TrailTriageIssue[] {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const visible = orderedIssueIds
    .map((issueId) => readable.authoritative.domain.issuesById.get(issueId))
    .filter((issue): issue is TrailTriageIssue => (
      issue?.context === "triage"
      && matchesTriageFilter(
        issue,
        input.filter,
        input.now,
        configuration.temporal.timezone,
      )
    ));

  if (input.ordering === "priority") {
    visible.sort((left, right) => {
      const priorityDelta = priorityOrder(left.priority) - priorityOrder(right.priority);
      if (priorityDelta !== 0) return priorityDelta;
      const dueDelta = left.due - right.due;
      return dueDelta !== 0 ? dueDelta : left.id.localeCompare(right.id);
    });
  }

  return visible;
}

function reviewSetIssueIdsFromSnapshot(
  readable: TrailEffectiveRuntimeSnapshot,
  orderedIssueIds: readonly string[],
  now: TrailTimestamp,
): readonly string[] {
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const horizonEnd = addTrailCalendarDays(
    now,
    configuration.temporal.timezone,
    TRAIL_TRIAGE_REVIEW_HORIZON_DAYS,
  );
  const reviewSet: string[] = [];

  for (const issueId of orderedIssueIds) {
    const issue = readable.authoritative.domain.issuesById.get(issueId);
    if (issue?.context === "triage" && issue.due <= horizonEnd) {
      reviewSet.push(issueId);
    }
  }

  if (reviewSet.length >= TRAIL_TRIAGE_MIN_REVIEW_SET_SIZE) {
    return reviewSet;
  }

  const included = new Set(reviewSet);
  for (const issueId of orderedIssueIds) {
    if (included.has(issueId)) continue;
    reviewSet.push(issueId);
    if (reviewSet.length >= TRAIL_TRIAGE_MIN_REVIEW_SET_SIZE) break;
  }

  return reviewSet;
}

/**
 * Returns the visible Triage queue for the current transient collection controls.
 * Canonical Review Set derivation remains separate and always uses the unfiltered
 * default queue.
 */
export function selectTrailTriageVisibleIssueIds(
  state: TrailRuntimeState,
  input: TrailTriagePageReadInput,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const orderedIssueIds = selectTrailTriageIssueIdsFromReadableSnapshot(readable);
  return visibleTriageIssuesFromSnapshot(readable, orderedIssueIds, input)
    .map((issue) => issue.id);
}

/**
 * Review Set is a derived focus suggestion over the full active Triage queue.
 * It never changes collection membership, ordering, or persisted entity facts.
 */
export function selectTrailTriageReviewSetIssueIds(
  state: TrailRuntimeState,
  now: TrailTimestamp,
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const orderedIssueIds = selectTrailTriageIssueIdsFromReadableSnapshot(readable);
  return reviewSetIssueIdsFromSnapshot(readable, orderedIssueIds, now);
}

/**
 * Builds the complete Page-facing Triage projection from one coherent readable
 * Runtime snapshot. Transient Filter/Order inputs remain explicit UI state.
 */
export function selectTrailTriagePageReadModel(
  state: TrailRuntimeState,
  input: TrailTriagePageReadInput,
): TrailTriagePageReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const orderedIssueIds = selectTrailTriageIssueIdsFromReadableSnapshot(readable);
  const visibleIssues = visibleTriageIssuesFromSnapshot(readable, orderedIssueIds, input);
  const visibleIssueIds = visibleIssues.map((issue) => issue.id);
  const reviewSetIssueIds = reviewSetIssueIdsFromSnapshot(readable, orderedIssueIds, input.now);
  const filterActive = isTrailCollectionFilterActive(input.filter);
  const showReviewBoundary = !filterActive && input.ordering === "review-due";
  const labelsById = new Map(configuration.labels.map((label) => [label.id, label] as const));
  const acceptProjects = selectTrailTriageAcceptProjectsFromReadableSnapshot(readable);
  const initiatives = [...readable.authoritative.domain.initiativesById.values()]
    .sort((left, right) => {
      const titleOrder = left.title.localeCompare(right.title);
      return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
    })
    .map(({ id, title }) => ({ id, title }));

  return {
    accept: {
      issue: {
        defaultProjectId: selectTrailDefaultTriageAcceptProjectIdFromReadableSnapshot(readable),
        projects: acceptProjects.map((project) => ({
          id: project.id,
          milestones: (readable.indexes.milestonesByProjectId.get(project.id) ?? [])
            .map((milestoneId) => readable.authoritative.domain.milestonesById.get(milestoneId))
            .filter((milestone): milestone is TrailMilestone => milestone !== undefined)
            .sort((left, right) => {
              const titleOrder = left.title.localeCompare(right.title);
              return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
            })
            .map(({ id, title }) => ({ id, title })),
          title: project.title,
        })),
      },
      project: { initiatives },
    },
    configuration,
    filteredEmpty: filterActive && orderedIssueIds.length > 0 && visibleIssueIds.length === 0,
    queue: visibleIssues.map((issue) => ({
      due: issue.due,
      id: issue.id,
      labels: issue.labelIds
        .map((labelId) => labelsById.get(labelId))
        .filter((label): label is TrailLabel => label !== undefined),
      priority: issue.priority,
      title: issue.title,
    })),
    reviewSet: {
      boundaryAfterIssueId: showReviewBoundary && reviewSetIssueIds.length < orderedIssueIds.length
        ? reviewSetIssueIds[reviewSetIssueIds.length - 1]
        : undefined,
      count: reviewSetIssueIds.length,
      needsGlobalQualifier: filterActive || input.ordering !== "review-due",
    },
    visibleIssueIds,
  };
}
