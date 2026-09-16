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

function pendingReceipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: new Promise<void>(() => { /* keep pending to isolate submission telemetry */ }),
    entityId,
  };
}

describe("Cycle rollover diagnostics", () => {
  it("observes close-and-start-next without changing Application semantics", () => {
    const { diagnostics, events } = recorder();
    const cycle: TrailCycle = {
      id: "cycle-source",
      issueIds: ["issue-a", "issue-b"],
      plannedEnd: 200,
      startedAt: 100,
    };
    const closeAndStartNext = vi.fn(() => pendingReceipt("cycle-next"));
    const session = {
      cycles: { closeAndStartNext },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    const input = { issueIds: ["issue-b"], plannedEnd: 400 };

    actions.cycles.closeAndStartNext(cycle, input);

    expect(closeAndStartNext).toHaveBeenCalledWith(cycle, input);
    expect(events).toEqual([{
      name: "ui.cycle.close-and-start-next.submitted",
      options: {
        correlationId: "command-cycle-next",
        data: {
          cycleId: cycle.id,
          entityId: "cycle-next",
          nextIssueCount: 1,
          plannedEnd: 400,
          sourceIssueCount: 2,
        },
      },
    }]);
  });
});
