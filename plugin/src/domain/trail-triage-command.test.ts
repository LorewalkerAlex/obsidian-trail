import { describe, expect, it } from "vitest";

import {
  normalizeQuickCaptureCommand,
  planCreateTriageIssue,
  QuickCaptureCommandError,
} from "./trail-triage-command";

const NOW = 1_786_464_000_000;

describe("Formal Quick Capture command", () => {
  it("freezes IDs, effective time, normalized title, and injected Due policy", () => {
    const ids = ["command-a", "issue-a"];
    const command = normalizeQuickCaptureCommand(
      { title: "  Review new idea  " },
      {
        createId: () => ids.shift()!,
        now: () => NOW,
        resolveDefaultDue: (effectiveAt) => effectiveAt + 7,
      },
    );

    expect(command).toEqual({
      commandId: "command-a",
      effectiveAt: NOW,
      issueId: "issue-a",
      resolvedDue: NOW + 7,
      title: "Review new idea",
    });
  });

  it("rejects empty or multiline capture titles before planning", () => {
    const environment = {
      createId: () => "id",
      now: () => NOW,
      resolveDefaultDue: () => NOW + 1,
    };

    expect(() => normalizeQuickCaptureCommand(
      { title: "   " },
      environment,
    )).toThrow(QuickCaptureCommandError);
    expect(() => normalizeQuickCaptureCommand(
      { title: "line one\nline two" },
      environment,
    )).toThrow(QuickCaptureCommandError);
  });

  it("plans a new Triage identity and rejects an effective-state collision", () => {
    const command = {
      commandId: "command-a",
      effectiveAt: NOW,
      issueId: "issue-a",
      resolvedDue: NOW + 7,
      title: "Review",
    };

    expect(planCreateTriageIssue(new Set(), command)).toEqual({
      kind: "ready",
      plan: {
        commandId: "command-a",
        issue: {
          context: "triage",
          due: NOW + 7,
          id: "issue-a",
          labelIds: [],
          title: "Review",
        },
        kind: "create-triage-issue",
      },
    });
    expect(planCreateTriageIssue(new Set(["issue-a"]), command)).toEqual({
      kind: "rejected",
      reason: "Issue ID already exists: issue-a",
    });
  });
});
