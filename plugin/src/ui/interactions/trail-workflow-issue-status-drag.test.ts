import { describe, expect, it } from "vitest";

import {
  resolveTrailWorkflowIssueStatusDragScope,
  type TrailWorkflowIssueStatusDragItem,
} from "./trail-workflow-issue-status-drag";

function issue(input: {
  readonly id: string;
  readonly statusDefinitionId: string;
  readonly targets: readonly (string | { readonly id: string; readonly requiresInput: boolean })[];
}): TrailWorkflowIssueStatusDragItem {
  return {
    id: input.id,
    statusDefinitionId: input.statusDefinitionId,
    targets: input.targets.map((target) => (
      typeof target === "string"
        ? { id: target, requiresInput: false }
        : target
    )),
  };
}

describe("Workflow Issue Status drag scope", () => {
  it("drags an unselected source alone without consuming unrelated mixed-Status selection", () => {
    const issues = [
      issue({ id: "issue-a", statusDefinitionId: "todo", targets: ["started"] }),
      issue({ id: "issue-b", statusDefinitionId: "started", targets: ["done"] }),
      issue({ id: "issue-c", statusDefinitionId: "backlog", targets: ["started"] }),
    ];

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues,
      selectedIssueIds: new Set(["issue-b", "issue-c"]),
      sourceIssueId: "issue-a",
    })).toEqual({
      issueIds: ["issue-a"],
      sourceStatusDefinitionId: "todo",
      targetStatusDefinitionIds: ["started"],
    });
  });

  it("uses every selected Issue in visible order when selection shares one concrete Status", () => {
    const issues = [
      issue({ id: "issue-a", statusDefinitionId: "started", targets: ["todo", "done"] }),
      issue({ id: "issue-b", statusDefinitionId: "started", targets: ["todo", "done"] }),
      issue({ id: "issue-c", statusDefinitionId: "todo", targets: ["started"] }),
    ];

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues,
      selectedIssueIds: new Set(["issue-b", "issue-a"]),
      sourceIssueId: "issue-b",
    })).toEqual({
      issueIds: ["issue-a", "issue-b"],
      sourceStatusDefinitionId: "started",
      targetStatusDefinitionIds: ["todo", "done"],
    });
  });

  it("blocks multi-item drag when the selected Issues span concrete Statuses", () => {
    const issues = [
      issue({ id: "issue-a", statusDefinitionId: "started", targets: ["done"] }),
      issue({ id: "issue-b", statusDefinitionId: "todo", targets: ["done"] }),
    ];

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues,
      selectedIssueIds: new Set(["issue-a", "issue-b"]),
      sourceIssueId: "issue-a",
    })).toBeNull();
  });

  it("intersects ordinary legal Status targets across a same-Status multi-selection", () => {
    const issues = [
      issue({ id: "issue-a", statusDefinitionId: "started", targets: ["todo", "done"] }),
      issue({ id: "issue-b", statusDefinitionId: "started", targets: ["done"] }),
    ];

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues,
      selectedIssueIds: new Set(["issue-a", "issue-b"]),
      sourceIssueId: "issue-a",
    })?.targetStatusDefinitionIds).toEqual(["done"]);
  });

  it("keeps needs-input targets for a single Issue but excludes them from multi-drag", () => {
    const issueA = issue({
      id: "issue-a",
      statusDefinitionId: "started",
      targets: [{ id: "done", requiresInput: true }],
    });
    const issueB = issue({ id: "issue-b", statusDefinitionId: "started", targets: ["done"] });

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues: [issueA, issueB],
      selectedIssueIds: new Set(),
      sourceIssueId: "issue-a",
    })?.targetStatusDefinitionIds).toEqual(["done"]);
    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues: [issueA, issueB],
      selectedIssueIds: new Set(["issue-a", "issue-b"]),
      sourceIssueId: "issue-a",
    })).toBeNull();
  });

  it("blocks selected drag rather than silently omitting a selected Issue outside visibility", () => {
    const issues = [
      issue({ id: "issue-a", statusDefinitionId: "started", targets: ["done"] }),
    ];

    expect(resolveTrailWorkflowIssueStatusDragScope({
      issues,
      selectedIssueIds: new Set(["issue-a", "issue-hidden"]),
      sourceIssueId: "issue-a",
    })).toBeNull();
  });
});
