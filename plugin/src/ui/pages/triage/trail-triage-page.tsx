import {
  Fragment,
  useMemo,
  useState,
} from "react";
import { useStore } from "zustand";

import {
  selectTrailReadableConfiguration,
  selectTrailReadableTriageIssueById,
  selectTrailReadableTriageIssueIds,
} from "../../../query/shared/trail-effective-query";
import { isTrailCollectionFilterActive } from "../../../query/shared/trail-collection-filter";
import {
  selectTrailTriageReviewSetIssueIds,
  selectTrailTriageVisibleIssueIds,
  type TrailTriageFilterPropertyId,
  type TrailTriageOrdering,
} from "../../../query/triage/trail-triage-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailLabelDots } from "../../entities/trail-label";
import { TrailTriageRow } from "../../entities/trail-triage-row";
import { useTrailCollectionFilterState } from "../../interactions/trail-collection-filter-state";
import { TrailButton } from "../../primitives/trail-button";
import { TrailTriageViewControls } from "./trail-triage-view-controls";

export function TrailTriagePage({
  runtimeStore,
}: {
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const configuration = selectTrailReadableConfiguration(state);
  const canonicalIssueIds = selectTrailReadableTriageIssueIds(state);
  const now = Date.now();
  const filters = useTrailCollectionFilterState<TrailTriageFilterPropertyId>();
  const [ordering, setOrdering] = useState<TrailTriageOrdering>("review-due");
  const filterActive = isTrailCollectionFilterActive(filters.state);
  const issueIds = selectTrailTriageVisibleIssueIds(state, {
    filter: filters.state,
    now,
    ordering,
  });
  const reviewSetIssueIds = selectTrailTriageReviewSetIssueIds(state, now);
  const showReviewBoundary = !filterActive && ordering === "review-due";
  const reviewBoundaryIssueId = showReviewBoundary && reviewSetIssueIds.length < canonicalIssueIds.length
    ? reviewSetIssueIds[reviewSetIssueIds.length - 1]
    : undefined;
  const labelsById = useMemo(() => new Map(
    (configuration?.labels ?? []).map((label) => [label.id, label] as const),
  ), [configuration]);

  return (
    <section aria-label="Triage queue" className="trail-triage-page">
      {configuration === null ? null : (
        <>
          <TrailTriageViewControls
            configuration={configuration}
            filter={filters.state}
            onClearAllFilters={filters.clearAll}
            onClearFilterClause={filters.clearClause}
            onOrderingChange={setOrdering}
            onSetDueFilter={filters.setDueValue}
            onToggleDiscreteFilter={filters.toggleDiscreteValue}
            ordering={ordering}
          />
          <div className="trail-triage-page__summary">
            {reviewSetIssueIds.length} to review{filterActive || ordering !== "review-due" ? " overall" : ""}
          </div>
          {filterActive && canonicalIssueIds.length > 0 && issueIds.length === 0 ? (
            <div className="trail-triage-page__filtered-empty">
              <span>No Triage entries match the filters.</span>
              <TrailButton onClick={filters.clearAll}>Clear filters</TrailButton>
            </div>
          ) : (
            <div className="trail-triage-page__queue">
              {issueIds.map((issueId) => {
                const issue = selectTrailReadableTriageIssueById(state, issueId);
                if (issue === undefined) return null;
                const labels = issue.labelIds
                  .map((labelId) => labelsById.get(labelId))
                  .filter((label) => label !== undefined);

                return (
                  <Fragment key={issue.id}>
                    <TrailTriageRow
                      labels={labels.length === 0 ? undefined : <TrailLabelDots labels={labels} />}
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
          )}
        </>
      )}
    </section>
  );
}
