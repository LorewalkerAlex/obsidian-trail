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
    description: "Keep this",
    due: 100,
    estimate: 5,
    id: "triage-a",
    labelIds: ["label-work"],
    priority: "high" as const,
    title: "Captured idea",
  };
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  return {
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map([[triage.id, triage]]),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    project,
    triage,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Triage planning", () => {
  it("creates a Triage Issue with the resolved Due", () => {
    const result = planCreateTrailTriageIssue(state(), {
      commandId: "command-create",
      due: 700,
      issueId: "triage-new",
      title: "Capture",
    });
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") expect(result.plan.issue.due).toBe(700);
  });

  it("edits matching Triage state and rejects a stale expected snapshot", () => {
    const planning = state();
    const edited = planEditTrailTriageIssue(planning, {
      commandId: "command-edit",
      due: 250,
      expectedIssue: planning.triage,
      title: "Edited title",
    });
    expect(edited.kind).toBe("ready");
    if (edited.kind === "ready") {
      expect(edited.plan.issue).toMatchObject({ due: 250, title: "Edited title" });
    }

    expect(planEditTrailTriageIssue(planning, {
      commandId: "command-stale",
      due: 300,
      expectedIssue: { ...planning.triage, title: "Stale title" },
      title: "Should reject",
    }).kind).toBe("rejected");
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

  it("only defers to a later Due", () => {
    const planning = state();
    expect(planDeferTrailTriageIssue(planning, {
      commandId: "command-defer",
      due: 99,
      expectedIssue: planning.triage,
    }).kind).toBe("rejected");
  });

  it("accepts into a new Workflow identity only with an explicit legal Project", () => {
    const planning = state();
    const result = planAcceptTrailTriageIssue(planning, {
      commandId: "command-accept",
      effectiveAt: 200,
      expectedIssue: planning.triage,
      projectId: planning.project.id,
      targetIssueId: "workflow-new",
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.targetIssue.id).toBe("workflow-new");
    expect(result.plan.targetIssue.createdAt).toBe(200);
    expect(result.plan.targetIssue.due).toBeUndefined();
    expect(result.plan.targetIssue.projectId).toBe(planning.project.id);
    expect(result.plan.plan.effects).toHaveLength(2);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "project", value: planning.project },
      kind: "entity-equals",
    });

    expect(planAcceptTrailTriageIssue(planning, {
      commandId: "command-accept-missing-project",
      effectiveAt: 201,
      expectedIssue: planning.triage,
      targetIssueId: "workflow-missing-project",
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "project-required" },
    });
  });

  it("converts Triage to a new Project and carries only Project-applicable content", () => {
    const planning = state();
    const baseConfiguration = planning.configuration;
    const configuration = {
      ...baseConfiguration,
      labelGroups: [
        ...baseConfiguration.labelGroups,
        {
          id: "group-issue-only",
          name: "Issue only",
          registeredEntityTypes: ["issue" as const],
          selectionMode: "multiple" as const,
        },
      ],
      labels: [
        ...baseConfiguration.labels,
        { groupId: "group-issue-only", id: "label-issue-only", name: "Issue only" },
      ],
    };
    const triage = {
      ...planning.triage,
      labelIds: ["label-work", "label-issue-only"],
    };
    const conversionState = {
      ...planning,
      configuration,
      domain: {
        ...planning.domain,
        issuesById: new Map([[triage.id, triage]]),
      },
      triage,
    };

    const result = planConvertTrailTriageIssueToProject(conversionState, {
      commandId: "command-convert",
      expectedIssue: triage,
      targetProjectId: "project-new",
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.targetProject).toEqual({
      description: "Keep this",
      id: "project-new",
      labelIds: ["label-work"],
      priority: "high",
      statusDefinitionId: "project-unstarted",
      title: "Captured idea",
    });
    expect(result.plan.targetProject).not.toHaveProperty("due");
    expect(result.plan.targetProject).not.toHaveProperty("estimate");
    expect(result.plan.plan.intent).toBe("triage.convert-project");
    expect(result.plan.plan.effects).toEqual([
      { after: { kind: "project", value: result.plan.targetProject }, kind: "create-entity" },
      { before: { kind: "issue", value: triage }, kind: "delete-entity" },
    ]);
  });

  it("rejects Convert to Project when the source snapshot is stale", () => {
    const planning = state();
    const result = planConvertTrailTriageIssueToProject(planning, {
      commandId: "command-convert-stale",
      expectedIssue: { ...planning.triage, title: "Stale" },
      targetProjectId: "project-new",
    });
    expect(result).toMatchObject({
      kind: "rejected",
      reason: { code: "triage-issue-changed" },
    });
  });
});
