import type { TrailTriageIssue } from "../../domain/model/trail-entities";
import {
  TRAIL_PRIORITIES,
  type TrailPriority,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import { addTrailCalendarDays } from "../../domain/rules/trail-temporal-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  type TrailCollectionFilterClause,
  type TrailCollectionFilterState,
  type TrailDiscreteFilterClause,
  matchesTrailDueFilter,
  matchesTrailOptionalDiscreteFilter,
  matchesTrailSetDiscreteFilter,
} from "../shared/trail-collection-filter";
import {
  selectTrailReadableRuntimeSnapshot,
  selectTrailReadableTriageIssueIds,
} from "../shared/trail-effective-query";

const TRAIL_TRIAGE_REVIEW_HORIZON_DAYS = 7;
const TRAIL_TRIAGE_MIN_REVIEW_SET_SIZE = 10;

export type TrailTriageFilterPropertyId = "due" | "labels" | "priority";
export type TrailTriageFilterState = TrailCollectionFilterState<TrailTriageFilterPropertyId>;
export type TrailTriageOrdering = "priority" | "review-due";

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

/**
 * Returns the visible Triage queue for the current transient collection controls.
 * Canonical Review Set derivation remains separate and always uses the unfiltered
 * default queue.
 */
export function selectTrailTriageVisibleIssueIds(
  state: TrailRuntimeState,
  input: {
    readonly filter: TrailTriageFilterState;
    readonly now: TrailTimestamp;
    readonly ordering: TrailTriageOrdering;
  },
): readonly string[] {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const visible = selectTrailReadableTriageIssueIds(state)
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

  return visible.map((issue) => issue.id);
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
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return [];

  const orderedIssueIds = selectTrailReadableTriageIssueIds(state);
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
