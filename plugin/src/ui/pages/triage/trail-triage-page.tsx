import { Fragment } from "react";
import { useStore } from "zustand";

import {
  selectTrailReadableConfiguration,
  selectTrailReadableTriageIssueById,
  selectTrailReadableTriageIssueIds,
} from "../../../query/shared/trail-effective-query";
import { selectTrailTriageReviewSetIssueIds } from "../../../query/triage/trail-triage-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailTriageRow } from "../../entities/trail-triage-row";

export function TrailTriagePage({
  runtimeStore,
}: {
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const issueIds = selectTrailReadableTriageIssueIds(state);
  const configuration = selectTrailReadableConfiguration(state);
  const reviewSetIssueIds = selectTrailTriageReviewSetIssueIds(state, Date.now());
  const reviewBoundaryIssueId = reviewSetIssueIds.length < issueIds.length
    ? reviewSetIssueIds[reviewSetIssueIds.length - 1]
    : undefined;

  return (
    <section aria-label="Triage queue" className="trail-triage-page">
      {configuration === null ? null : (
        <>
          <div className="trail-triage-page__summary">
            {reviewSetIssueIds.length} to review
          </div>
          <div className="trail-triage-page__queue">
            {issueIds.map((issueId) => {
              const issue = selectTrailReadableTriageIssueById(state, issueId);
              if (issue === undefined) return null;

              return (
                <Fragment key={issue.id}>
                  <TrailTriageRow
                    priority={issue.priority}
                    reviewDue={(
                      <TrailDueDate
                        timestamp={issue.due}
                        timezone={configuration.temporal.timezone}
                      />
                    )}
                    title={issue.title}
                  />
                  {issue.id === reviewBoundaryIssueId ? (
                    <div
                      aria-hidden="true"
                      className="trail-triage-page__review-boundary"
                      data-review-boundary="true"
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
