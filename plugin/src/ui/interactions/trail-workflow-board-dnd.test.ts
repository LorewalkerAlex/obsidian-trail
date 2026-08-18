import { describe, expect, it } from "vitest";

import {
  canTrailWorkflowIssueDropInStatus,
  createTrailWorkflowIssueDragData,
  createTrailWorkflowStatusDropData,
  resolveTrailWorkflowStatusDrop,
} from "./trail-workflow-board-dnd";

describe("Workflow Board drag semantics", () => {
  it("resolves only a same-lane Status change inside one Board instance", () => {
    const instanceId = Symbol("board");
    const source = createTrailWorkflowIssueDragData({
      instanceId,
      issueId: "issue-a",
      projectId: "project-a",
      sourceStatusDefinitionId: "issue-unstarted",
    });
    const target = createTrailWorkflowStatusDropData({
      instanceId,
      projectId: "project-a",
      targetStatusDefinitionId: "issue-started",
    });

    expect(canTrailWorkflowIssueDropInStatus(source, target)).toBe(true);
    expect(resolveTrailWorkflowStatusDrop(source, target)).toEqual({
      issueId: "issue-a",
      targetStatusDefinitionId: "issue-started",
    });
  });

  it("rejects cross-Board and cross-Project-lane drops", () => {
    const source = createTrailWorkflowIssueDragData({
      instanceId: Symbol("source-board"),
      issueId: "issue-a",
      projectId: "project-a",
      sourceStatusDefinitionId: "issue-unstarted",
    });

    expect(resolveTrailWorkflowStatusDrop(source, createTrailWorkflowStatusDropData({
      instanceId: Symbol("other-board"),
      projectId: "project-a",
      targetStatusDefinitionId: "issue-started",
    }))).toBeUndefined();

    expect(resolveTrailWorkflowStatusDrop(source, createTrailWorkflowStatusDropData({
      instanceId: source.instanceId,
      projectId: "project-b",
      targetStatusDefinitionId: "issue-started",
    }))).toBeUndefined();
  });

  it("treats a same-Status drop as a no-op", () => {
    const instanceId = Symbol("board");
    const source = createTrailWorkflowIssueDragData({
      instanceId,
      issueId: "issue-a",
      sourceStatusDefinitionId: "issue-started",
    });
    const target = createTrailWorkflowStatusDropData({
      instanceId,
      targetStatusDefinitionId: "issue-started",
    });

    expect(canTrailWorkflowIssueDropInStatus(source, target)).toBe(true);
    expect(resolveTrailWorkflowStatusDrop(source, target)).toBeUndefined();
  });
});
