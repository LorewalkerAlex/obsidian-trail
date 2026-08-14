import { describe, expect, it, vi } from "vitest";

import { executeTrailSingleTransaction } from "./trail-single-transaction-executor";

describe("Trail single transaction executor", () => {
  it("dispatches a Triage create through the canonical executor", async () => {
    const issue = {
      context: "triage" as const,
      due: 10,
      id: "triage-a",
      labelIds: [],
      title: "Capture",
    };
    const result = {
      contribution: {
        filePath: "Trail/Collections/Triage.md",
        issuesById: { [issue.id]: issue },
        sourceByIssueId: {},
      },
      issues: [],
    };
    const appendIssue = vi.fn(async () => result);
    await expect(executeTrailSingleTransaction({
      commandId: "command-a",
      intent: "triage.issue.create",
      operation: { issue, kind: "triage-create" },
      sourcePath: "Trail/Collections/Triage.md",
    }, {
      triageCreate: { appendIssue },
    }, "command-a")).resolves.toEqual({ kind: "triage-source", result });
    expect(appendIssue).toHaveBeenCalledWith(issue, "command-a");
  });

  it("fails explicitly when the materialized operation has no persistence capability", async () => {
    await expect(executeTrailSingleTransaction({
      commandId: "command-a",
      intent: "triage.issue.create",
      operation: {
        issue: {
          context: "triage",
          due: 10,
          id: "triage-a",
          labelIds: [],
          title: "Capture",
        },
        kind: "triage-create",
      },
      sourcePath: "Trail/Collections/Triage.md",
    }, {})).rejects.toThrow("triage-create");
  });
});
