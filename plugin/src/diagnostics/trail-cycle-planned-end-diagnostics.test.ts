import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
import type { TrailCycle } from "../domain/model/trail-entities";
import type { TrailDiagnostics, TrailDiagnosticRecordOptions } from "./trail-diagnostics";
import { createDiagnosticTrailUiActions } from "./trail-diagnostic-observers";

function recorder() {
  const events: Array<{ name: string; options?: TrailDiagnosticRecordOptions }> = [];
  const diagnostics: TrailDiagnostics = {
    enabled: true,
    createCorrelationId: (prefix) => `session:${prefix}:1`,
    dispose: () => Promise.resolve(),
    exportRecent: () => Promise.resolve(""),
    flush: () => Promise.resolve(),
    record: (name, options) => events.push({ name, options }),
  };
  return { diagnostics, events };
}

describe("Cycle planned-end diagnostics", () => {
  it("observes planned-end changes without changing Application semantics", () => {
    const { diagnostics, events } = recorder();
    const cycle: TrailCycle = {
      id: "cycle-a",
      issueIds: ["issue-a"],
      plannedEnd: 200,
      startedAt: 100,
    };
    const changePlannedEnd = vi.fn(() => ({
      entityId: cycle.id,
      kind: "unchanged" as const,
    }));
    const session = {
      cycles: { changePlannedEnd },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.cycles.changePlannedEnd(cycle, 300);

    expect(changePlannedEnd).toHaveBeenCalledWith(cycle, 300);
    expect(events).toEqual([{
      name: "ui.cycle.planned-end.unchanged",
      options: {
        data: {
          cycleId: cycle.id,
          entityId: cycle.id,
          sourcePlannedEnd: 200,
          targetPlannedEnd: 300,
        },
      },
    }]);
  });
});
