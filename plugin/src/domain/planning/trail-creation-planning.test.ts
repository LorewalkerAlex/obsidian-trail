import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planCreateTrailProjectFromDraft,
  planCreateTrailWorkflowIssueFromDraft,
} from "./trail-creation-planning";

function state() {
  const initiative = {
    id: "initiative-a",
    labelIds: [] as string[],
    title: "Initiative A",
  };
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const milestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map([[initiative.id, initiative]]),
      issuesById: new Map(),
      milestonesById: new Map([[milestone.id, milestone]]),
      projectsById: new Map([[project.id, project]]),
    },
    initiative,
    milestone,
    project,
    workspaceState: createTrailTestWorkspaceState(project.id),
  };
}

describe("standard creation planning", () => {
  it("creates one final Workflow Issue from the standard Composer draft", () => {
    const planning = state();
    const result = planCreateTrailWorkflowIssueFromDraft(planning, {
      commandId: "command-issue",
      description: "Body",
      due: 500,
      effectiveAt: 100,
      estimate: "medium",
      issueId: "issue-new",
      labelIds: ["label-work"],
      milestoneId: planning.milestone.id,
      priority: "high",
      projectId: planning.project.id,
      title: "Created from draft",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.issue).toEqual({
      context: "workflow",
      createdAt: 100,
      description: "Body",
      due: 500,
      estimate: "medium",
      id: "issue-new",
      labelIds: ["label-work"],
      milestoneId: planning.milestone.id,
      priority: "high",
      projectId: planning.project.id,
      statusDefinitionId: "issue-backlog",
      title: "Created from draft",
    });
    expect(result.plan.plan.effects).toEqual([
      { after: { kind: "issue", value: result.plan.issue }, kind: "create-entity" },
    ]);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "project", value: planning.project },
      kind: "entity-equals",
    });
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "milestone", value: planning.milestone },
      kind: "entity-equals",
    });
    expect(result.plan.plan.preconditions.filter((precondition) => (
      precondition.kind === "entity-absent" && precondition.entityId === result.plan.issue.id
    ))).toHaveLength(1);
    expect(result.plan.plan.preconditions).not.toContainEqual({
      entity: { kind: "issue", value: result.plan.issue },
      kind: "entity-equals",
    });
  });

  it("rejects a Composer Milestone outside the selected Project", () => {
    const planning = state();
    const otherProject = {
      id: "project-b",
      labelIds: [] as string[],
      statusDefinitionId: "project-unstarted",
      title: "Project B",
    };
    const otherMilestone = {
      id: "milestone-b",
      projectId: otherProject.id,
      title: "Milestone B",
    };
    planning.domain.projectsById.set(otherProject.id, otherProject);
    planning.domain.milestonesById.set(otherMilestone.id, otherMilestone);

    expect(planCreateTrailWorkflowIssueFromDraft(planning, {
      commandId: "command-mismatch",
      effectiveAt: 100,
      issueId: "issue-new",
      labelIds: [],
      milestoneId: otherMilestone.id,
      projectId: planning.project.id,
      title: "Mismatch",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "milestone-project-mismatch" },
    });
  });

  it("creates one final Project from the standard Composer draft", () => {
    const planning = state();
    const result = planCreateTrailProjectFromDraft(planning, {
      commandId: "command-project",
      description: "Project body",
      due: 900,
      initiativeId: planning.initiative.id,
      labelIds: ["label-work"],
      priority: "urgent",
      projectId: "project-new",
      title: "Created Project",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.project).toEqual({
      description: "Project body",
      due: 900,
      id: "project-new",
      initiativeId: planning.initiative.id,
      labelIds: ["label-work"],
      priority: "urgent",
      statusDefinitionId: "project-unstarted",
      title: "Created Project",
    });
    expect(result.plan.plan.effects).toEqual([
      { after: { kind: "project", value: result.plan.project }, kind: "create-entity" },
    ]);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "initiative", value: planning.initiative },
      kind: "entity-equals",
    });
    expect(result.plan.plan.preconditions.filter((precondition) => (
      precondition.kind === "entity-absent" && precondition.entityId === result.plan.project.id
    ))).toHaveLength(1);
    expect(result.plan.plan.preconditions).not.toContainEqual({
      entity: { kind: "project", value: result.plan.project },
      kind: "entity-equals",
    });
  });
});
