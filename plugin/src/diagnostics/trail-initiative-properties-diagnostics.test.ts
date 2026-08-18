import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
import type { TrailInitiative } from "../domain/model/trail-entities";
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

describe("Initiative properties diagnostics", () => {
  it("observes Initiative property edits without logging description content", () => {
    const { diagnostics, events } = recorder();
    const initiative: TrailInitiative = {
      id: "initiative-a",
      labelIds: [],
      title: "Initiative A",
    };
    const editProperties = vi.fn(() => ({
      entityId: initiative.id,
      kind: "unchanged" as const,
    }));
    const session = {
      initiatives: { editProperties },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    const input = {
      description: "Private strategy notes",
      due: 123,
      labelIds: ["label-a"],
      priority: "urgent" as const,
      title: "Updated Initiative",
    };

    actions.initiatives.editProperties(initiative, input);

    expect(editProperties).toHaveBeenCalledWith(initiative, input);
    expect(events).toEqual([{
      name: "ui.initiative.properties.unchanged",
      options: {
        data: {
          descriptionProvided: true,
          due: 123,
          entityId: initiative.id,
          initiativeId: initiative.id,
          labelCount: 1,
          priority: "urgent",
          titleLength: 18,
        },
      },
    }]);
  });
});
