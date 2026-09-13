import {
  resolveTrailCycleDefaultEndDate,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  selectTrailCyclesIndexReadModel,
  type TrailCyclesIndexReadModel,
} from "./trail-cycle-page-query";

export interface TrailCyclesPageReadModel extends TrailCyclesIndexReadModel {
  readonly canStart: boolean;
  readonly suggestedPlannedEndDate?: TrailCalendarDate;
}

export function selectTrailCyclesPageReadModel(
  state: TrailRuntimeState,
  now: number,
): TrailCyclesPageReadModel | null {
  const index = selectTrailCyclesIndexReadModel(state);
  if (index === null) return null;

  const canStart = index.current === undefined && state.control.kind === "ready";
  return {
    ...index,
    canStart,
    suggestedPlannedEndDate: index.current === undefined
      ? resolveTrailCycleDefaultEndDate(
          now,
          index.configuration.temporal.timezone,
          index.configuration.cycle.defaultEndRule,
        )
      : undefined,
  };
}
