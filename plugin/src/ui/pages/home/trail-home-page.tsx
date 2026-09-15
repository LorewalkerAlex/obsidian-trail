import { useState } from "react";
import { useStore } from "zustand";

import { selectTrailHomeReadModel } from "../../../query/home/trail-home-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailCycleStart } from "../cycles/trail-cycle-start";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailLifecycleWidget } from "./trail-lifecycle-widget";
import { TrailThisWeekWidget } from "./trail-this-week-widget";
import { TrailWeeklyMeetingNotesWidget } from "./trail-weekly-meeting-notes-widget";
import { TrailWorkPulseWidget } from "./trail-work-pulse-widget";
import { TrailWorkTrendWidget } from "./trail-work-trend-widget";

type TrailHomePageActions = {
  readonly cycles: Pick<TrailUiActions["cycles"], "start">;
  readonly weeklyNote: TrailUiActions["weeklyNote"];
};

export function TrailHomePage({
  actions,
  onCycleActivate,
  onProjectActivate,
  onProjectsActivate,
  onTriageActivate,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailHomePageActions;
  readonly onCycleActivate: (cycleId: string) => void;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly onTriageActivate: () => void;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const [startCycleOpen, setStartCycleOpen] = useState(false);
  const readModel = selectTrailHomeReadModel(state, Date.now());

  return (
    <div className="trail-home-page">
      <TrailPageHeader title="Home" />

      {readModel === null ? null : (
        <div className="trail-home-page__widgets">
          <div className="trail-home-page__slot" data-home-slot="this-week">
            <TrailThisWeekWidget
              days={readModel.thisWeek.days}
              monthLabel={readModel.thisWeek.monthLabel}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="work-pulse">
            <TrailWorkPulseWidget
              currentCycle={readModel.workPulse.currentCycle}
              onCurrentCycleActivate={onCycleActivate}
              onProjectActivate={onProjectActivate}
              onProjectsActivate={onProjectsActivate}
              onStartCycle={() => setStartCycleOpen(true)}
              onTriageActivate={onTriageActivate}
              projects={readModel.workPulse.inProgressProjects}
              timezone={readModel.workPulse.timezone}
              triage={readModel.workPulse.triage}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="lifecycle">
            <TrailLifecycleWidget
              days={readModel.lifecycle.days}
              months={readModel.lifecycle.months}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="work-trend">
            <TrailWorkTrendWidget
              days={readModel.workTrend.days}
              hasHistory={readModel.workTrend.hasHistory}
              rangeLabel={readModel.workTrend.rangeLabel}
            />
          </div>

          <div className="trail-home-page__slot" data-home-slot="weekly-notes">
            <TrailWeeklyMeetingNotesWidget
              actions={actions.weeklyNote}
              renderMarkdown={renderMarkdown}
            />
          </div>
        </div>
      )}

      {!startCycleOpen ? null : (
        <TrailCycleStart
          actions={actions.cycles}
          onDismiss={() => setStartCycleOpen(false)}
          onStarted={(cycleId) => {
            setStartCycleOpen(false);
            onCycleActivate(cycleId);
          }}
          runtimeStore={runtimeStore}
        />
      )}
    </div>
  );
}
