import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../model/trail-entities";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planChangeTrailWorkflowIssueStatus,
  planCreateTrailWorkflowIssue,
  planMoveTrailWorkflowIssueProject,
} from "./trail-issue-planning";

function state() {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const milestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map([[issue.id, issue]]),
      milestonesById: new Map([[milestone.id, milestone]]),
      projectsById: new Map([
        [project.id, project],
        [projectB.id, projectB],
      ]),
    },
    issue,
    milestone,
    project,
    projectB,
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

  it("moves an Issue between Projects while preserving identity and clearing Milestone", () => {
    const planning = state();
    const moved = planMoveTrailWorkflowIssueProject(planning, {
      commandId: "command-move",
      expectedIssue: planning.issue,
      targetProjectId: planning.projectB.id,
    });
    expect(moved.kind).toBe("ready");
    if (moved.kind !== "ready") return;
    expect(moved.plan.issue).toMatchObject({
      id: planning.issue.id,
      projectId: planning.projectB.id,
    });
    expect(moved.plan.issue.milestoneId).toBeUndefined();
    expect(moved.plan.plan.intent).toBe("workflow.issue.move-project");
    expect(moved.plan.plan.effects).toEqual([{
      after: { kind: "issue", value: moved.plan.issue },
      before: { kind: "issue", value: planning.issue },
      kind: "replace-entity",
    }]);
    expect(moved.plan.plan.preconditions).toContainEqual({
      entity: { kind: "project", value: planning.projectB },
      kind: "entity-equals",
    });
  });

  it("keeps same-Project membership unchanged and preserves its Milestone", () => {
    const planning = state();
    const unchanged = planMoveTrailWorkflowIssueProject(planning, {
      commandId: "command-same-project",
      expectedIssue: planning.issue,
      targetProjectId: planning.project.id,
    });
    expect(unchanged.kind).toBe("ready");
    if (unchanged.kind !== "ready") return;
    expect(unchanged.plan.issue).toEqual(planning.issue);
  });

  it("rejects moving non-terminal work into a terminal Project", () => {
    const planning = state();
    planning.domain.projectsById.set(planning.projectB.id, {
      ...planning.projectB,
      statusDefinitionId: "project-completed",
    });
    const result = planMoveTrailWorkflowIssueProject(planning, {
      commandId: "command-terminal-project",
      expectedIssue: planning.issue,
      targetProjectId: planning.projectB.id,
    });
    expect(result).toMatchObject({
      kind: "rejected",
      reason: { code: "project-terminal" },
    });
  });
});
