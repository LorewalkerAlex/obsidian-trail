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

function pendingReceipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: new Promise<void>(() => { /* keep pending to isolate submission telemetry */ }),
    entityId,
  };
}

describe("Project create diagnostics", () => {
  it("preserves the full Project creation use case while recording metadata only", () => {
    const { diagnostics, events } = recorder();
    const createFromDraft = vi.fn(() => pendingReceipt("new-project"));
    const session = {
      projects: { createFromDraft },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    const input = {
      description: "Private project notes",
      due: 123,
      initiativeId: "initiative-a",
      labelIds: ["label-work"],
      priority: "high" as const,
      title: "Portfolio",
    };

    actions.projects.createFromDraft(input);

    expect(createFromDraft).toHaveBeenCalledWith(input);
    expect(events).toEqual([{
      name: "ui.project.create.submitted",
      options: {
        correlationId: "command-new-project",
        data: {
          descriptionProvided: true,
          due: 123,
          entityId: "new-project",
          initiativeId: "initiative-a",
          labelCount: 1,
          priority: "high",
          titleLength: 9,
        },
      },
    }]);
    expect(JSON.stringify(events)).not.toContain(input.description);
  });
});
