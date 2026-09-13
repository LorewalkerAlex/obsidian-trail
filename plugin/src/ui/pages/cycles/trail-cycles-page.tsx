import { useState } from "react";
import { useStore } from "zustand";

import {
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../../domain/rules/trail-temporal-rules";
import { selectTrailCyclesPageReadModel } from "../../../query/cycles/trail-cycles-page-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailCollectionRow } from "../../patterns/trail-collection-row";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailCyclesPageActions = Pick<TrailUiActions["cycles"], "start">;

function formatCycleDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(new Date(timestamp));
}

function formatCycleRange(startedAt: number, plannedEnd: number, timezone: string): string {
  return `${formatCycleDate(startedAt, timezone)} – ${formatCycleDate(plannedEnd, timezone)}`;
}

function plannedEndTimestamp(date: TrailCalendarDate, timezone: string): number {
  return resolveTrailZonedDateTimeParts({
    day: date.day,
    hour: 23,
    millisecond: 999,
    minute: 59,
    month: date.month,
    second: 59,
    year: date.year,
  }, timezone);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailCyclesPage({
  actions,
  onCycleActivate,
  runtimeStore,
}: {
  readonly actions: TrailCyclesPageActions;
  readonly onCycleActivate: (cycleId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const [feedback, setFeedback] = useState<string>();
  const [starting, setStarting] = useState(false);
  const now = Date.now();
  const readModel = selectTrailCyclesPageReadModel(state, now);

  if (readModel === null) {
    return <section aria-label="Cycles" className="trail-cycles-page" />;
  }

  const timezone = readModel.configuration.temporal.timezone;
  const startCycle = async (): Promise<void> => {
    const suggestion = readModel.suggestedPlannedEndDate;
    if (!readModel.canStart || suggestion === undefined || starting) return;

    setFeedback(undefined);
    setStarting(true);
    try {
      const receipt = actions.start({
        plannedEnd: plannedEndTimestamp(suggestion, timezone),
      });
      await receipt.completion;
      onCycleActivate(receipt.entityId);
    } catch (error: unknown) {
      setFeedback(`Cycle start failed: ${errorMessage(error)}`);
      setStarting(false);
    }
  };

  const renderStartAction = () => (
    <TrailButton
      disabled={!readModel.canStart || starting}
      onClick={() => { void startCycle(); }}
    >
      {starting ? "Starting…" : "Start cycle"}
    </TrailButton>
  );

  return (
    <section aria-label="Cycles" className="trail-cycles-page">
      <TrailPageHeader
        actions={readModel.current === undefined ? renderStartAction() : undefined}
        title="Cycles"
      />

      {readModel.current === undefined ? (
        <div className="trail-cycles-page__current-empty">
          <TrailEmptyState
            action={renderStartAction()}
            description="Start a cycle when you are ready to timebox work."
            title="No current cycle"
          />
        </div>
      ) : null}

      {feedback === undefined ? null : (
        <div className="trail-cycles-page__feedback" role="alert">
          {feedback}
        </div>
      )}

      {readModel.history.length === 0 ? null : (
        <section aria-labelledby="trail-cycles-history-title" className="trail-cycles-page__history">
          <h2 className="trail-cycles-page__history-title" id="trail-cycles-history-title">
            Previous
          </h2>
          <div className="trail-cycles-page__history-list">
            {readModel.history.map((cycle) => {
              const range = formatCycleRange(cycle.startedAt, cycle.plannedEnd, timezone);
              const issueCount = `${cycle.issueCount} ${cycle.issueCount === 1 ? "issue" : "issues"}`;
              const activate = () => onCycleActivate(cycle.id);

              return (
                <TrailCollectionRow
                  aria-label={`${range}, ${issueCount}`}
                  key={cycle.id}
                  onClick={activate}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    activate();
                  }}
                  role="link"
                  tabIndex={0}
                >
                  <div className="trail-cycles-page__history-row">
                    <span className="trail-cycles-page__history-range">{range}</span>
                    <span className="trail-cycles-page__history-count">{issueCount}</span>
                  </div>
                </TrailCollectionRow>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
