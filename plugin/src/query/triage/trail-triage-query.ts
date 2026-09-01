import type { TrailTimestamp } from "../../domain/model/trail-values";
import { addTrailCalendarDays } from "../../domain/rules/trail-temporal-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailReadableRuntimeSnapshot,
  selectTrailReadableTriageIssueIds,
} from "../shared/trail-effective-query";

const TRAIL_TRIAGE_REVIEW_HORIZON_DAYS = 7;
const TRAIL_TRIAGE_MIN_REVIEW_SET_SIZE = 10;

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
