import { describe, expect, it } from "vitest";

import type { TrailWorkflowIssue } from "../model/trail-entities";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planChangeTrailWorkflowIssueMilestone,
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
  const milestoneA2 = {
    id: "milestone-a2",
    projectId: project.id,
    title: "Milestone A2",
  };
  const milestoneB = {
    id: "milestone-b",
    projectId: projectB.id,
    title: "Milestone B",
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
      milestonesById: new Map([
        [milestone.id, milestone],
        [milestoneA2.id, milestoneA2],
        [milestoneB.id, milestoneB],
      ]),
      projectsById: new Map([
        [project.id, project],
        [projectB.id, projectB],
      ]),
    },
    issue,
    milestone,
    milestoneA2,
    milestoneB,
    project,
    projectB,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Workflow Issue planning", () => {
  it("creates Workflow work in Backlog only with an explicit legal Project", () => {
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
      expect(ready.plan.issue.projectId).toBe("project-a");
      expect(ready.plan.plan.preconditions).toContainEqual({
        entity: { kind: "project", value: planning.project },
        kind: "entity-equals",
      });
    }

    planning.domain.projectsById.set(planning.project.id, {
      ...planning.project,
      statusDefinitionId: "project-canceled",
    });
    expect(planCreateTrailWorkflowIssue(planning, {
      commandId: "command-create-blocked",
      effectiveAt: 102,
      issueId: "issue-blocked",
      projectId: planning.project.id,
      title: "Blocked Issue",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "project-terminal" },
    });
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
      estimate: "medium",
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

  it("requires Project reopen before reopening terminal Issue work", () => {
    const planning = state();
    const completedIssue: TrailWorkflowIssue = {
      ...planning.issue,
      estimate: "medium",
      statusDefinitionId: "issue-completed",
      terminalAt: 300,
    };
    const completedProject = {
      ...planning.project,
      statusDefinitionId: "project-completed",
    };
    planning.domain.issuesById.set(completedIssue.id, completedIssue);
    planning.domain.projectsById.set(completedProject.id, completedProject);

    expect(planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-reopen-blocked",
      effectiveAt: 400,
      expectedIssue: completedIssue,
      targetStatusDefinitionId: "issue-unstarted",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "project-terminal" },
    });

    const reopenedProject = {
      ...completedProject,
      statusDefinitionId: "project-unstarted",
    };
    planning.domain.projectsById.set(reopenedProject.id, reopenedProject);
    const ready = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-reopen-after-project",
      effectiveAt: 500,
      expectedIssue: completedIssue,
      targetStatusDefinitionId: "issue-unstarted",
    });
    expect(ready.kind).toBe("ready");
    if (ready.kind === "ready") {
      expect(ready.plan.plan.preconditions).toContainEqual({
        entity: { kind: "project", value: reopenedProject },
        kind: "entity-equals",
      });
    }
  });

  it("replaces terminalAt across terminal categories and preserves it within one category", () => {
    const planning = state();
    const completed: TrailWorkflowIssue = {
      ...planning.issue,
      estimate: "medium",
      statusDefinitionId: "issue-completed",
      terminalAt: 300,
    };
    planning.domain.issuesById.set(completed.id, completed);

    const canceled = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-cancel",
      effectiveAt: 400,
      expectedIssue: completed,
      targetStatusDefinitionId: "issue-canceled",
    });
    expect(canceled.kind).toBe("ready");
    if (canceled.kind !== "ready") return;
    expect(canceled.plan.issue.estimate).toBe("medium");
    expect(canceled.plan.issue.terminalAt).toBe(400);

    planning.domain.issuesById.set(canceled.plan.issue.id, canceled.plan.issue);
    const unchangedTerminalCategory = planChangeTrailWorkflowIssueStatus(planning, {
      commandId: "command-cancel-again",
      effectiveAt: 500,
      expectedIssue: canceled.plan.issue,
      targetStatusDefinitionId: "issue-canceled",
    });
    expect(unchangedTerminalCategory.kind).toBe("ready");
    if (unchangedTerminalCategory.kind === "ready") {
      expect(unchangedTerminalCategory.plan.issue.terminalAt).toBe(400);
    }
  });

  it("moves an Issue between explicit Projects while preserving identity and clearing Milestone", () => {
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

    const unchanged = planMoveTrailWorkflowIssueProject(planning, {
      commandId: "command-same-project",
      expectedIssue: planning.issue,
      targetProjectId: planning.project.id,
    });
    expect(unchanged.kind).toBe("ready");
    if (unchanged.kind === "ready") {
      expect(unchanged.plan.issue).toEqual(planning.issue);
    }
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

  it("allows terminal Issue history to move into a terminal Project", () => {
    const planning = state();
    const completedIssue: TrailWorkflowIssue = {
      ...planning.issue,
      estimate: "medium",
      statusDefinitionId: "issue-completed",
      terminalAt: 20,
    };
    planning.domain.issuesById.set(completedIssue.id, completedIssue);
    planning.domain.projectsById.set(planning.projectB.id, {
      ...planning.projectB,
      statusDefinitionId: "project-completed",
    });

    const result = planMoveTrailWorkflowIssueProject(planning, {
      commandId: "command-terminal-history-move",
      expectedIssue: completedIssue,
      targetProjectId: planning.projectB.id,
    });
    expect(result.kind).toBe("ready");
  });

  it("changes Milestone only within the Issue Project and supports clearing", () => {
    const planning = state();
    const changed = planChangeTrailWorkflowIssueMilestone(planning, {
      commandId: "command-milestone",
      expectedIssue: planning.issue,
      targetMilestoneId: planning.milestoneA2.id,
    });
    expect(changed.kind).toBe("ready");
    if (changed.kind !== "ready") return;
    expect(changed.plan.issue.milestoneId).toBe(planning.milestoneA2.id);
    expect(changed.plan.plan.preconditions).toContainEqual({
      entity: { kind: "milestone", value: planning.milestoneA2 },
      kind: "entity-equals",
    });

    expect(planChangeTrailWorkflowIssueMilestone(planning, {
      commandId: "command-milestone-mismatch",
      expectedIssue: planning.issue,
      targetMilestoneId: planning.milestoneB.id,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "milestone-project-mismatch" },
    });

    const cleared = planChangeTrailWorkflowIssueMilestone(planning, {
      commandId: "command-milestone-clear",
      expectedIssue: planning.issue,
    });
    expect(cleared.kind).toBe("ready");
    if (cleared.kind === "ready") {
      expect(cleared.plan.issue.milestoneId).toBeUndefined();
    }
  });
});
