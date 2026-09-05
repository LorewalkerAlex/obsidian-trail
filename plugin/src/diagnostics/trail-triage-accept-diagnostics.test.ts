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

function receipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: new Promise<void>(() => { /* isolate submission telemetry */ }),
    entityId,
  };
}

const source: TrailTriageIssue = {
  context: "triage",
  description: "Private source body",
  due: 100,
  id: "triage-a",
  labelIds: ["label-source"],
  priority: "urgent",
  title: "Private source title",
};

describe("Triage Accept diagnostics", () => {
  it("observes destination-first Issue and Project drafts without recording text content", () => {
    const { diagnostics, events } = recorder();
    const acceptFromDraft = vi.fn(() => receipt("issue-new"));
    const convertToProjectFromDraft = vi.fn(() => receipt("project-new"));
    const session = {
      triage: { acceptFromDraft, convertToProjectFromDraft },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.triage.acceptFromDraft(source, {
      description: "Private target issue body",
      due: 200,
      estimate: "medium",
      labelIds: ["label-work"],
      milestoneId: "milestone-a",
      priority: "high",
      projectId: "project-a",
      title: "Private target issue title",
    });
    actions.triage.convertToProjectFromDraft(source, {
      description: "Private target project body",
      due: 300,
      initiativeId: "initiative-a",
      labelIds: ["label-delivery"],
      priority: "low",
      title: "Private target project title",
    });

    expect(events).toEqual([
      {
        name: "ui.triage.accept.submitted",
        options: {
          correlationId: "command-issue-new",
          data: {
            descriptionProvided: true,
            due: 200,
            entityId: "issue-new",
            estimate: "medium",
            labelCount: 1,
            milestoneId: "milestone-a",
            priority: "high",
            projectId: "project-a",
            sourceIssueId: source.id,
            titleLength: 26,
          },
        },
      },
      {
        name: "ui.triage.convert-project.submitted",
        options: {
          correlationId: "command-project-new",
          data: {
            descriptionProvided: true,
            due: 300,
            entityId: "project-new",
            initiativeId: "initiative-a",
            labelCount: 1,
            priority: "low",
            sourceIssueId: source.id,
            titleLength: 28,
          },
        },
      },
    ]);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("Private target issue body");
    expect(serialized).not.toContain("Private target project body");
    expect(serialized).not.toContain("Private target issue title");
    expect(serialized).not.toContain("Private target project title");
  });
});
