import { useState } from "react";
import { useStore } from "zustand";

import { formatTrailCycleLabel } from "../../../domain/rules/trail-cycle-label";
import { selectTrailCyclesPageReadModel } from "../../../query/cycles/trail-cycles-page-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailCollectionRow } from "../../patterns/trail-collection-row";
import { TrailEmptyState } from "../../patterns/trail-empty-state";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailCycleStart } from "./trail-cycle-start";

type TrailCyclesPageActions = Pick<TrailUiActions["cycles"], "start">;

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
  const [startOpen, setStartOpen] = useState(false);
  const now = Date.now();
  const readModel = selectTrailCyclesPageReadModel(state, now);

  if (readModel === null) {
    return <section aria-label="Cycles" className="trail-cycles-page" />;
  }

  const timezone = readModel.configuration.temporal.timezone;
  const renderStartAction = () => (
    <TrailButton
      disabled={!readModel.canStart}
      onClick={() => setStartOpen(true)}
    >
      Start cycle
    </TrailButton>
  );

  return (
    <>
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

        {readModel.history.length === 0 ? null : (
          <section aria-labelledby="trail-cycles-history-title" className="trail-cycles-page__history">
            <h2 className="trail-cycles-page__history-title" id="trail-cycles-history-title">
              Previous
            </h2>
            <div className="trail-cycles-page__history-list">
              {readModel.history.map((cycle) => {
                const range = formatTrailCycleLabel(cycle, timezone);
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

      {!startOpen ? null : (
        <TrailCycleStart
          actions={actions}
          onDismiss={() => setStartOpen(false)}
          onStarted={(cycleId) => {
            setStartOpen(false);
            onCycleActivate(cycleId);
          }}
          runtimeStore={runtimeStore}
        />
      )}
    </>
  );
}
