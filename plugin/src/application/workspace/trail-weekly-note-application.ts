import { readTrailZonedDateTimeParts } from "../../domain/rules/trail-temporal-rules";
import type { TrailWeeklyNoteSnapshot } from "../../markdown/schema/trail-weekly-note-schema";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { readTrailPlanningState } from "../trail-application-support";
import {
  normalizeTrailCommandTime,
  type TrailCommandEnvironment,
} from "../trail-command";

export type { TrailWeeklyNoteSnapshot } from "../../markdown/schema/trail-weekly-note-schema";

/** Application-owned capability contract; persistence provides the concrete utility-source owner. */
export interface TrailWeeklyNoteGateway {
  archiveCurrent(date: string, current: string): Promise<TrailWeeklyNoteSnapshot>;
  load(): Promise<TrailWeeklyNoteSnapshot>;
  replaceCurrent(current: string): Promise<TrailWeeklyNoteSnapshot>;
}

function padTwo(value: number): string {
  return value.toString().padStart(2, "0");
}

function archiveDateFor(epochMilliseconds: number, timezone: string): string {
  const parts = readTrailZonedDateTimeParts(epochMilliseconds, timezone);
  return `${parts.year.toString().padStart(4, "0")}-${padTwo(parts.month)}-${padTwo(parts.day)}`;
}

/** Application facade for the non-Domain Weekly Note utility. */
export class TrailWeeklyNoteApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly gateway: TrailWeeklyNoteGateway,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public load(): Promise<TrailWeeklyNoteSnapshot> {
    return this.gateway.load();
  }

  public replaceCurrent(current: string): Promise<TrailWeeklyNoteSnapshot> {
    readTrailPlanningState(this.runtimeStore);
    return this.gateway.replaceCurrent(current);
  }

  public archiveCurrent(current: string): Promise<TrailWeeklyNoteSnapshot> {
    const state = readTrailPlanningState(this.runtimeStore);
    const effectiveAt = normalizeTrailCommandTime(this.environment);
    return this.gateway.archiveCurrent(
      archiveDateFor(effectiveAt, state.configuration.temporal.timezone),
      current,
    );
  }
}
