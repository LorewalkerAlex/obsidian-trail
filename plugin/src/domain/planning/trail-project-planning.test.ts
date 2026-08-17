import { describe, expect, it } from "vitest";

import type { TrailProject, TrailWorkflowIssue } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planChangeTrailProjectInitiative,
  planChangeTrailProjectStatus,
  planCreateTrailProject,
} from "./trail-project-planning";

function state() {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const initiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map([[initiative.id, initiative]]),
      issuesById: new Map([[issue.id, issue]]),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    initiative,
    issue,
    project,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Project planning", () => {
  it("creates a Project with the configured Unstarted default", () => {
    const planning = state();
    const result = planCreateTrailProject(planning, {
      commandId: "command-create",
      projectId: "project-new",
      title: "Project New",
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.project.statusDefinitionId).toBe("project-unstarted");
    expect(result.plan.plan.effects).toHaveLength(1);
  });

  it("rejects Complete while a non-terminal child Issue remains", () => {
    const planning = state();
    expect(planChangeTrailProjectStatus(planning, {
      commandId: "command-complete-blocked",
      expectedProject: planning.project,
      targetStatusDefinitionId: "project-completed",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "project-active-child" },
    });
  });

  it("completes after child work is terminal and reopens without rewriting Issues", () => {
    const planning = state();
    const canceledIssue: TrailWorkflowIssue = {
      ...planning.issue,
      statusDefinitionId: "issue-canceled",
      terminalAt: 20,
    };
    planning.domain.issuesById.set(canceledIssue.id, canceledIssue);

    const completed = planChangeTrailProjectStatus(planning, {
      commandId: "command-complete",
      expectedProject: planning.project,
      targetStatusDefinitionId: "project-completed",
    });
    expect(completed.kind).toBe("ready");
    if (completed.kind !== "ready") return;
    expect(completed.plan.project.statusDefinitionId).toBe("project-completed");
    expect(completed.plan.plan.effects).toHaveLength(1);
    expect(planning.domain.issuesById.get(canceledIssue.id)).toEqual(canceledIssue);

    planning.domain.projectsById.set(completed.plan.project.id, completed.plan.project);
    const reopened = planChangeTrailProjectStatus(planning, {
      commandId: "command-reopen",
      expectedProject: completed.plan.project,
      targetStatusDefinitionId: "project-unstarted",
    });
    expect(reopened.kind).toBe("ready");
    if (reopened.kind === "ready") {
      expect(reopened.plan.project.statusDefinitionId).toBe("project-unstarted");
      expect(reopened.plan.plan.effects).toHaveLength(1);
      expect(planning.domain.issuesById.get(canceledIssue.id)).toEqual(canceledIssue);
    }
  });

  it("sets and clears Initiative membership while preserving Project identity", () => {
    const planning = state();
    const assigned = planChangeTrailProjectInitiative(planning, {
      commandId: "command-initiative-set",
      expectedProject: planning.project,
      targetInitiativeId: planning.initiative.id,
    });
    expect(assigned.kind).toBe("ready");
    if (assigned.kind !== "ready") return;
    expect(assigned.plan.project).toMatchObject({
      id: planning.project.id,
      initiativeId: planning.initiative.id,
    });
    expect(assigned.plan.plan.preconditions).toContainEqual({
      entity: { kind: "initiative", value: planning.initiative },
      kind: "entity-equals",
    });

    planning.domain.projectsById.set(assigned.plan.project.id, assigned.plan.project);
    const cleared = planChangeTrailProjectInitiative(planning, {
      commandId: "command-initiative-clear",
      expectedProject: assigned.plan.project,
    });
    expect(cleared.kind).toBe("ready");
    if (cleared.kind === "ready") {
      expect(cleared.plan.project.initiativeId).toBeUndefined();
      expect(cleared.plan.project.id).toBe(planning.project.id);
    }
  });

  it("rejects an unknown Initiative target before producing optimistic state", () => {
    const planning = state();
    expect(planChangeTrailProjectInitiative(planning, {
      commandId: "command-initiative-missing",
      expectedProject: planning.project,
      targetInitiativeId: "initiative-missing",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "initiative-missing" },
    });
  });
});