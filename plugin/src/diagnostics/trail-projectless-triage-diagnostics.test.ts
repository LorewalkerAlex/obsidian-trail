import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
import type { TrailTriageIssue } from "../domain/model/trail-entities";
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

describe("explicit-Project Triage diagnostics", () => {
  it("records the selected Project when Accept targets Workflow", () => {
    const { diagnostics, events } = recorder();
    const triage: TrailTriageIssue = {
      context: "triage",
      due: 100,
      id: "triage-a",
      labelIds: [],
      title: "Captured",
    };
    const accept = vi.fn(() => ({
      commandId: "command-workflow-a",
      completion: new Promise<void>(() => { /* submission evidence only */ }),
      entityId: "workflow-a",
    }));
    const session = { triage: { accept } } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.triage.accept(triage, "project-a");

    expect(accept).toHaveBeenCalledWith(triage, "project-a");
    expect(events).toEqual([{
      name: "ui.triage.accept.submitted",
      options: {
        correlationId: "command-workflow-a",
        data: {
          entityId: "workflow-a",
          projectId: "project-a",
          sourceIssueId: triage.id,
        },
      },
    }]);
  });
});
