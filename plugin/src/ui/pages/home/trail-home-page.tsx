import { useStore } from "zustand";

import { selectTrailHomeReadModel } from "../../../query/home/trail-home-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailPageHeader } from "../../patterns/trail-page-header";
import { TrailLifecycleWidget } from "./trail-lifecycle-widget";
import { TrailThisWeekWidget } from "./trail-this-week-widget";
import { TrailWorkTrendWidget } from "./trail-work-trend-widget";

export function TrailHomePage({
  runtimeStore,
}: {
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
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
        </div>
      )}
    </div>
  );
}
