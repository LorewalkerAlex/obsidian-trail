import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
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

describe("Triage create diagnostics", () => {
  it("observes the full Composer create without recording description content", () => {
    const { diagnostics, events } = recorder();
    const receipt = {
      commandId: "command-triage-create",
      completion: new Promise<void>(() => { /* isolate submission telemetry */ }),
      entityId: "triage-created",
    };
    const create = vi.fn(() => receipt);
    const session = {
      triage: { create },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    const input = {
      description: "Private capture body",
      due: 123,
      labelIds: ["label-a"],
      priority: "high" as const,
      title: "Review this capture",
    };

    actions.triage.create(input);

    expect(create).toHaveBeenCalledWith(input);
    expect(events).toEqual([{
      name: "ui.triage.create.submitted",
      options: {
        correlationId: receipt.commandId,
        data: {
          descriptionProvided: true,
          due: 123,
          entityId: receipt.entityId,
          labelCount: 1,
          priority: "high",
          titleLength: 19,
        },
      },
    }]);
  });
});
