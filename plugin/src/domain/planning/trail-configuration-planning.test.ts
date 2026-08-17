import { describe, expect, it } from "vitest";

import type { TrailConfiguration } from "../model/trail-configuration";
import type { TrailIssue, TrailProject } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { planChangeTrailConfiguration } from "./trail-configuration-planning";
import type { TrailPlanningState } from "./trail-planning-state";

function state(configuration = createTrailTestConfiguration()): TrailPlanningState & {
  readonly issue: Extract<TrailIssue, { context: "workflow" }>;
  readonly project: TrailProject;
} {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue: Extract<TrailIssue, { context: "workflow" }> = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: ["label-work"],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  return {
    configuration,
    domain: {
      cyclesById: new Map(),
      initiativesById: new Map(),
      issuesById: new Map([[issue.id, issue]]),
      milestonesById: new Map(),
      projectsById: new Map([[project.id, project]]),
    },
    issue,
    project,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

function configurationWithReferenceBreaks(base: TrailConfiguration): TrailConfiguration {
  const issueReady = {
    category: "unstarted" as const,
    entityType: "issue" as const,
    id: "issue-ready",
    name: "Ready",
  };
  return {
    ...base,
    labels: [
      { groupId: "group-area", id: "label-home", name: "Home" },
    ],
    statusDefinitions: [
      ...base.statusDefinitions.map((definition) => (
        definition.id === "issue-unstarted"
          ? { ...definition, category: "started" as const }
          : definition
      )),
      issueReady,
    ],
    workflowStatuses: {
      ...base.workflowStatuses,
      issue: {
        ...base.workflowStatuses.issue,
        started: {
          ...base.workflowStatuses.issue.started,
          definitionIds: [
            ...base.workflowStatuses.issue.started.definitionIds,
            "issue-unstarted",
          ],
        },
        unstarted: {
          defaultId: issueReady.id,
          definitionIds: [issueReady.id],
        },
      },
    },
  };
}

describe("Trail configuration planning", () => {
  it("applies safe display-only configuration changes without entity repairs", () => {
    const planning = state();
    const nextConfiguration: TrailConfiguration = {
      ...planning.configuration,
      labels: planning.configuration.labels.map((label) => (
        label.id === "label-work" ? { ...label, name: "Work area" } : label
      )),
      statusDefinitions: planning.configuration.statusDefinitions.map((definition) => (
        definition.id === "issue-unstarted" ? { ...definition, name: "Ready" } : definition
      )),
    };

    const result = planChangeTrailConfiguration(planning, {
      commandId: "command-safe-config",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.updatedEntities).toEqual([]);
    expect(result.plan.plan.effects).toHaveLength(1);
    expect(result.plan.plan.effects[0]?.kind).toBe("replace-configuration");
  });

  it("requires explicit Status and Label repairs and merges them into one entity effect", () => {
    const planning = state();
    const nextConfiguration = configurationWithReferenceBreaks(planning.configuration);

    const missing = planChangeTrailConfiguration(planning, {
      commandId: "command-missing-repairs",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
    });
    expect(missing).toMatchObject({
      kind: "needs-input",
      input: { code: "configuration-reference-resolution-required" },
    });

    const invalidStatus = planChangeTrailConfiguration(planning, {
      commandId: "command-invalid-status-repair",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
      resolvedLabelIdsByEntityId: { [planning.issue.id]: ["label-home"] },
      resolvedStatusDefinitionIdsByEntityId: { [planning.issue.id]: "issue-started" },
    });
    expect(invalidStatus).toMatchObject({
      kind: "rejected",
      reason: { code: "configuration-status-resolution-invalid" },
    });

    const ready = planChangeTrailConfiguration(planning, {
      commandId: "command-repair-references",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
      resolvedLabelIdsByEntityId: { [planning.issue.id]: ["label-home"] },
      resolvedStatusDefinitionIdsByEntityId: { [planning.issue.id]: "issue-ready" },
    });
    expect(ready.kind).toBe("ready");
    if (ready.kind !== "ready") return;

    expect(ready.plan.updatedEntities).toHaveLength(1);
    const updated = ready.plan.updatedEntities[0];
    expect(updated?.kind).toBe("issue");
    if (updated?.kind !== "issue" || updated.value.context !== "workflow") return;
    expect(updated.value.statusDefinitionId).toBe("issue-ready");
    expect(updated.value.labelIds).toEqual(["label-home"]);

    const entityEffects = ready.plan.plan.effects.filter(({ kind }) => kind === "replace-entity");
    expect(entityEffects).toHaveLength(1);
  });

  it("requires explicit Label cancellation when applicability is removed", () => {
    const planning = state();
    const nextConfiguration: TrailConfiguration = {
      ...planning.configuration,
      labelGroups: planning.configuration.labelGroups.map((group) => (
        group.id === "group-area"
          ? { ...group, registeredEntityTypes: ["initiative", "project"] }
          : group
      )),
    };

    expect(planChangeTrailConfiguration(planning, {
      commandId: "command-scope-needs-input",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
    })).toMatchObject({
      kind: "needs-input",
      input: { code: "configuration-reference-resolution-required" },
    });

    expect(planChangeTrailConfiguration(planning, {
      commandId: "command-scope-invalid-repair",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
      resolvedLabelIdsByEntityId: { [planning.issue.id]: ["label-work"] },
    })).toMatchObject({
      kind: "rejected",
      reason: { code: "configuration-label-resolution-invalid" },
    });

    const cleared = planChangeTrailConfiguration(planning, {
      commandId: "command-scope-clear",
      expectedConfiguration: planning.configuration,
      nextConfiguration,
      resolvedLabelIdsByEntityId: { [planning.issue.id]: [] },
    });
    expect(cleared.kind).toBe("ready");
    if (cleared.kind !== "ready") return;
    const updated = cleared.plan.updatedEntities[0];
    expect(updated?.kind).toBe("issue");
    if (updated?.kind === "issue") expect(updated.value.labelIds).toEqual([]);
  });

  it("rejects stale or intrinsically invalid configuration requests before planning repairs", () => {
    const planning = state();
    const staleExpected: TrailConfiguration = {
      ...planning.configuration,
      temporal: { ...planning.configuration.temporal, timezone: "UTC" },
    };
    expect(planChangeTrailConfiguration(planning, {
      commandId: "command-stale",
      expectedConfiguration: staleExpected,
      nextConfiguration: planning.configuration,
    })).toMatchObject({ kind: "rejected", reason: { code: "configuration-changed" } });

    const invalidConfiguration: TrailConfiguration = {
      ...planning.configuration,
      workflowStatuses: {
        ...planning.configuration.workflowStatuses,
        issue: {
          ...planning.configuration.workflowStatuses.issue,
          unstarted: { defaultId: "issue-unstarted", definitionIds: [] },
        },
      },
    };
    expect(planChangeTrailConfiguration(planning, {
      commandId: "command-invalid-config",
      expectedConfiguration: planning.configuration,
      nextConfiguration: invalidConfiguration,
    })).toMatchObject({ kind: "rejected", reason: { code: "configuration-invalid" } });
  });
});
