import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../model/trail-entities";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planChangeTrailWorkflowIssueStatus, planCreateTrailWorkflowIssue } from "./trail-issue-planning";

function state() {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: "project-a",
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map([[issue.id, issue]]),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    issue,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Workflow Issue planning", () => {
  it("creates Workflow work in Backlog and protects a terminal Project", () => {
    const planning = state();
    const ready = planCreateTrailWorkflowIssue(planning, {
      commandId: "command-create",
      effectiveAt: 100,
      issueId: "issue-new",
      projectId: "project-a",
      title: "New Issue",
    });
    expect(ready.kind).toBe("ready");
    if (ready.kind === "ready") {
      expect(ready.plan.issue.statusDefinitionId).toBe("issue-backlog");
      expect(ready.plan.issue.createdAt).toBe(100);
    }
  });

  it("requests Estimate before Completed and keeps firstStartedAt on reopen", () => {
    const planning = state();
    const needsInput = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-done",
      effectiveAt: 100,
      expectedIssue: planning.issue,
      targetStatusDefinitionId: "issue-completed",
    });
    expect(needsInput.kind).toBe("needs-input");

    const started = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-start",
      effectiveAt: 200,
      expectedIssue: planning.issue,
      targetStatusDefinitionId: "issue-started",
    });
    expect(started.kind).toBe("ready");
    if (started.kind !== "ready") return;
    expect(started.plan.issue.firstStartedAt).toBe(200);

    planning.domain.issuesById.set("issue-a", {
      ...started.plan.issue,
      estimate: 3,
      statusDefinitionId: "issue-completed",
      terminalAt: 300,
    });
    const reopenedCurrent = planning.domain.issuesById.get("issue-a")!;
    const reopened = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-reopen",
      effectiveAt: 400,
      expectedIssue: reopenedCurrent,
      targetStatusDefinitionId: "issue-unstarted",
    });
    expect(reopened.kind).toBe("ready");
    if (reopened.kind === "ready") {
      expect(reopened.plan.issue.firstStartedAt).toBe(200);
      expect(reopened.plan.issue.terminalAt).toBeUndefined();
    }
  });
});
