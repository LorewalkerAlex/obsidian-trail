import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planEditTrailWorkflowIssueProperties } from "./trail-issue-planning";

function planningState() {
  const configuration = createTrailTestConfiguration();
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const milestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 10,
    firstStartedAt: 20,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Issue A",
  };
  return {
    configuration,
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map([[issue.id, issue]]),
      milestonesById: new Map([[milestone.id, milestone]]),
      projectsById: new Map([[project.id, project]]),
    },
    issue,
    milestone,
    project,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Workflow Issue planning properties", () => {
  it("replaces editable properties while preserving identity, relations, Status, and lifecycle facts", () => {
    const state = planningState();
    const result = planEditTrailWorkflowIssueProperties(state, {
      commandId: "command-properties",
      description: "Planning notes",
      due: 500,
      estimate: "medium",
      expectedIssue: state.issue,
      labelIds: ["label-work"],
      priority: "high",
      title: "Updated Issue",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.issue).toEqual({
      ...state.issue,
      description: "Planning notes",
      due: 500,
      estimate: "medium",
      labelIds: ["label-work"],
      priority: "high",
      title: "Updated Issue",
    });
    expect(result.plan.plan.intent).toBe("workflow.issue.edit-properties");
    expect(result.plan.issue.projectId).toBe(state.project.id);
    expect(result.plan.issue.milestoneId).toBe(state.milestone.id);
    expect(result.plan.issue.statusDefinitionId).toBe("issue-started");
    expect(result.plan.issue.createdAt).toBe(10);
    expect(result.plan.issue.firstStartedAt).toBe(20);
  });

  it("rejects clearing Estimate from an already Completed Issue", () => {
    const state = planningState();
    const completed: TrailWorkflowIssue = {
      ...state.issue,
      estimate: "large",
      statusDefinitionId: "issue-completed",
      terminalAt: 30,
    };
    state.domain.issuesById.set(completed.id, completed);

    expect(planEditTrailWorkflowIssueProperties(state, {
      commandId: "command-clear-estimate",
      expectedIssue: completed,
      labelIds: completed.labelIds,
      title: completed.title,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "estimate-required" },
    });
  });

  it("rejects stale expected state and invalid Label membership", () => {
    const state = planningState();
    state.domain.issuesById.set(state.issue.id, { ...state.issue, title: "Changed elsewhere" });
    expect(planEditTrailWorkflowIssueProperties(state, {
      commandId: "command-stale",
      expectedIssue: state.issue,
      labelIds: [],
      title: "Local edit",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "workflow-issue-changed" },
    });

    const fresh = planningState();
    expect(planEditTrailWorkflowIssueProperties(fresh, {
      commandId: "command-label",
      expectedIssue: fresh.issue,
      labelIds: ["missing-label"],
      title: fresh.issue.title,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "label-missing" },
    });
  });
});
