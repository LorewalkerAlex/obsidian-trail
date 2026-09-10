import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
import type { TrailWorkflowIssue } from "../domain/model/trail-entities";
import type {
  TrailDiagnostics,
  TrailDiagnosticRecordOptions,
} from "./trail-diagnostics";
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

describe("Workflow Issue delete diagnostics", () => {
  it("preserves the UI delete intent while recording submission on the diagnostics boundary", () => {
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-started",
      title: "Issue A",
    };
    const receipt = {
      commandId: "command-delete-issue-a",
      completion: new Promise<void>(() => { /* isolate submission telemetry */ }),
      entityId: issue.id,
    };
    const deleteIssue = vi.fn(() => receipt);
    const session = {
      issues: { delete: deleteIssue },
    } as unknown as TrailApplicationSession;
    const { diagnostics, events } = recorder();

    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    expect(actions.issues.delete(issue)).toBe(receipt);

    expect(deleteIssue).toHaveBeenCalledWith(issue);
    expect(events).toEqual([{
      name: "ui.workflow.issue-delete.submitted",
      options: {
        correlationId: receipt.commandId,
        data: {
          entityId: issue.id,
          issueId: issue.id,
        },
      },
    }]);
  });
});
