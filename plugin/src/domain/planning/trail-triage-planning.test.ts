import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planAcceptTrailTriageIssue,
  planConvertTrailTriageIssueToProject,
  planCreateTrailTriageIssue,
  planDeferTrailTriageIssue,
  planDeleteTrailTriageIssue,
  planEditTrailTriageIssue,
} from "./trail-triage-planning";

function state() {
  const triage = {
    context: "triage" as const,
    description: "Source body",
    due: 100,
    estimate: "large" as const,
    id: "triage-a",
    labelIds: ["label-work"],
    priority: "high" as const,
    title: "Captured idea",
  };
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
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map([[initiative.id, initiative]]),
      issuesById: new Map([[triage.id, triage]]),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    initiative,
    project,
    triage,
    workspaceState: createTrailTestWorkspaceState(project.id),
  };
}

describe("Triage planning", () => {
  it("creates a rich Triage Issue from the standard Triage draft", () => {
    const result = planCreateTrailTriageIssue(state(), {
      commandId: "command-create",
      description: "Capture body",
      due: 700,
      issueId: "triage-new",
      labelIds: ["label-work"],
      priority: "urgent",
      title: "Capture",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.issue).toEqual({
      context: "triage",
      description: "Capture body",
      due: 700,
      id: "triage-new",
      labelIds: ["label-work"],
      priority: "urgent",
      title: "Capture",
    });
  });

  it("replaces the complete editable Triage snapshot and rejects stale input", () => {
    const planning = state();
    const edited = planEditTrailTriageIssue(planning, {
      commandId: "command-edit",
      description: undefined,
      due: 250,
      expectedIssue: planning.triage,
      labelIds: [],
      priority: undefined,
      title: "Edited title",
    });

    expect(edited.kind).toBe("ready");
    if (edited.kind === "ready") {
      expect(edited.plan.issue).toEqual({
        ...planning.triage,
        description: undefined,
        due: 250,
        labelIds: [],
        priority: undefined,
        title: "Edited title",
      });
    }

    expect(planEditTrailTriageIssue(planning, {
      commandId: "command-stale",
      due: 300,
      expectedIssue: { ...planning.triage, title: "Stale title" },
      labelIds: planning.triage.labelIds,
      priority: planning.triage.priority,
      title: "Should reject",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "triage-issue-changed" },
    });
  });

  it("deletes only the matching Triage identity", () => {
    const planning = state();
    const deleted = planDeleteTrailTriageIssue(planning, {
      commandId: "command-delete",
      expectedIssue: planning.triage,
    });

    expect(deleted.kind).toBe("ready");
    if (deleted.kind === "ready") {
      expect(deleted.plan.plan.effects).toEqual([{
        before: { kind: "issue", value: planning.triage },
        kind: "delete-entity",
      }]);
    }
  });

  it("only defers the same Triage entry to a later Review Due", () => {
    const planning = state();
    expect(planDeferTrailTriageIssue(planning, {
      commandId: "command-defer-invalid",
      due: 99,
      expectedIssue: planning.triage,
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "triage-defer-not-later" },
    });

    const deferred = planDeferTrailTriageIssue(planning, {
      commandId: "command-defer",
      due: 200,
      expectedIssue: planning.triage,
    });
    expect(deferred.kind).toBe("ready");
    if (deferred.kind === "ready") {
      expect(deferred.plan.issue).toEqual({ ...planning.triage, due: 200 });
    }
  });

  it("accepts the explicit standard Issue draft without copying source-only properties", () => {
    const planning = state();
    const result = planAcceptTrailTriageIssue(planning, {
      commandId: "command-accept",
      description: "Composer body",
      effectiveAt: 200,
      expectedIssue: planning.triage,
      labelIds: [],
      projectId: planning.project.id,
      targetIssueId: "workflow-new",
      title: "Composer title",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.targetIssue).toEqual({
      context: "workflow",
      createdAt: 200,
      description: "Composer body",
      due: undefined,
      estimate: undefined,
      id: "workflow-new",
      labelIds: [],
      priority: undefined,
      projectId: planning.project.id,
      statusDefinitionId: "issue-backlog",
      title: "Composer title",
    });
    expect(result.plan.targetIssue.due).toBeUndefined();
    expect(result.plan.targetIssue.estimate).toBeUndefined();
    expect(result.plan.targetIssue.priority).toBeUndefined();
    expect(result.plan.plan.effects).toEqual([
      { after: { kind: "issue", value: result.plan.targetIssue }, kind: "create-entity" },
      { before: { kind: "issue", value: planning.triage }, kind: "delete-entity" },
    ]);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "project", value: planning.project },
      kind: "entity-equals",
    });
  });

  it("accepts the explicit standard Project draft without copying source-only properties", () => {
    const planning = state();
    const result = planConvertTrailTriageIssueToProject(planning, {
      commandId: "command-project",
      description: "Project composer body",
      expectedIssue: planning.triage,
      initiativeId: planning.initiative.id,
      labelIds: [],
      targetProjectId: "project-new",
      title: "Project composer title",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.targetProject).toEqual({
      description: "Project composer body",
      due: undefined,
      id: "project-new",
      initiativeId: planning.initiative.id,
      labelIds: [],
      priority: undefined,
      statusDefinitionId: "project-unstarted",
      title: "Project composer title",
    });
    expect(result.plan.targetProject.due).toBeUndefined();
    expect(result.plan.targetProject.priority).toBeUndefined();
    expect(result.plan.plan.effects).toEqual([
      { after: { kind: "project", value: result.plan.targetProject }, kind: "create-entity" },
      { before: { kind: "issue", value: planning.triage }, kind: "delete-entity" },
    ]);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "initiative", value: planning.initiative },
      kind: "entity-equals",
    });
  });

  it("rejects Accept when the source snapshot is stale", () => {
    const planning = state();
    expect(planAcceptTrailTriageIssue(planning, {
      commandId: "command-stale",
      effectiveAt: 200,
      expectedIssue: { ...planning.triage, title: "Stale" },
      labelIds: [],
      projectId: planning.project.id,
      targetIssueId: "workflow-new",
      title: "Target",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "triage-issue-changed" },
    });
  });
});
