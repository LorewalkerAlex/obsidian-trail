import { describe, expect, it } from "vitest";

import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type {
  TrailMutationPlan,
  TrailStateEffect,
} from "../../mutation/plans/trail-mutation-plan";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../../source-sync/trail-authoritative-source-sync";
import type { TrailMutationCommandResult } from "../trail-application-support";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { TrailConfigurationApplication } from "./trail-configuration-application";

type ReplaceConfigurationEffect = Extract<TrailStateEffect, { kind: "replace-configuration" }>;
type ReplaceEntityEffect = Extract<TrailStateEffect, { kind: "replace-entity" }>;

function configurationWithReadyStatus(): TrailConfiguration {
  const base = createTrailTestConfiguration();
  const ready = {
    category: "unstarted" as const,
    entityType: "issue" as const,
    id: "issue-ready",
    name: "Ready",
  };
  return {
    ...base,
    statusDefinitions: base.statusDefinitions.flatMap((definition) => (
      definition.id === "issue-unstarted" ? [definition, ready] : [definition]
    )),
    workflowStatuses: {
      ...base.workflowStatuses,
      issue: {
        ...base.workflowStatuses.issue,
        unstarted: {
          defaultId: "issue-unstarted",
          definitionIds: ["issue-unstarted", ready.id],
        },
      },
    },
  };
}

function requireConfigurationEffect(plan: TrailMutationPlan): ReplaceConfigurationEffect {
  const effect = plan.effects.find(
    (candidate): candidate is ReplaceConfigurationEffect => candidate.kind === "replace-configuration",
  );
  if (effect === undefined) throw new Error("Expected replace-configuration effect");
  return effect;
}

function harness(
  configuration: TrailConfiguration,
  createIds: readonly string[] = [],
) {
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue = {
    context: "workflow" as const,
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
      {
        issues: [issue],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      { issues: [], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });

  const submitted: TrailMutationPlan[] = [];
  const sourceSync: TrailAuthoritativeSourceSync = {
    async submit(plan) {
      submitted.push(plan);
      return { commandId: plan.commandId, operations: [], topology: "single" };
    },
  };
  let nextId = 0;
  const queuedIds = [...createIds];
  const application = new TrailConfigurationApplication(runtimeStore, sourceSync, {
    createId: () => queuedIds.shift() ?? `generated-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, issue, submitted };
}

async function requireSubmittedPlan(
  result: TrailMutationCommandResult,
  submitted: readonly TrailMutationPlan[],
): Promise<TrailMutationPlan> {
  expect(result.kind).toBe("submitted");
  if (result.kind !== "submitted") throw new Error("Expected submitted mutation");
  await result.receipt.completion;
  const plan = submitted[0];
  if (plan === undefined) throw new Error("Expected submitted plan");
  return plan;
}

describe("TrailConfigurationApplication Status management", () => {
  it("owns Status-local create, rename, order, and default changes", async () => {
    const base = createTrailTestConfiguration();
    const createTest = harness(base, ["issue-review", "command-create"]);
    const createPlan = await requireSubmittedPlan(createTest.application.createStatusDefinition({
      category: "unstarted",
      entityType: "issue",
      expectedConfiguration: base,
      name: "  Review  ",
    }), createTest.submitted);
    const created = requireConfigurationEffect(createPlan).after;
    expect(created.workflowStatuses.issue.unstarted.definitionIds).toEqual([
      "issue-unstarted",
      "issue-review",
    ]);
    expect(created.statusDefinitions.find(({ id }) => id === "issue-review")).toEqual({
      category: "unstarted",
      entityType: "issue",
      id: "issue-review",
      name: "Review",
    });
    expect(created.statusDefinitions.map(({ id }) => id).indexOf("issue-review"))
      .toBeLessThan(created.statusDefinitions.map(({ id }) => id).indexOf("issue-started"));
    expect(createPlan.effects.filter(({ kind }) => kind === "replace-entity")).toEqual([]);

    const configured = configurationWithReadyStatus();
    const renameTest = harness(configured);
    const renamePlan = await requireSubmittedPlan(renameTest.application.renameStatusDefinition({
      expectedConfiguration: configured,
      name: "  Ready to start  ",
      statusDefinitionId: "issue-ready",
    }), renameTest.submitted);
    expect(requireConfigurationEffect(renamePlan).after.statusDefinitions
      .find(({ id }) => id === "issue-ready")?.name).toBe("Ready to start");

    const reorderTest = harness(configured);
    const reorderPlan = await requireSubmittedPlan(reorderTest.application.reorderStatusDefinitions({
      category: "unstarted",
      definitionIds: ["issue-ready", "issue-unstarted"],
      entityType: "issue",
      expectedConfiguration: configured,
    }), reorderTest.submitted);
    expect(requireConfigurationEffect(reorderPlan).after.workflowStatuses.issue.unstarted.definitionIds)
      .toEqual(["issue-ready", "issue-unstarted"]);

    const defaultTest = harness(configured);
    const defaultPlan = await requireSubmittedPlan(defaultTest.application.setStatusCategoryDefault({
      category: "unstarted",
      entityType: "issue",
      expectedConfiguration: configured,
      statusDefinitionId: "issue-ready",
    }), defaultTest.submitted);
    expect(requireConfigurationEffect(defaultPlan).after.workflowStatuses.issue.unstarted.defaultId)
      .toBe("issue-ready");
    expect(defaultPlan.effects.filter(({ kind }) => kind === "replace-entity")).toEqual([]);
  });

  it("requires reorder to preserve the exact current Category membership", () => {
    const configuration = configurationWithReadyStatus();
    const test = harness(configuration);

    expect(() => test.application.reorderStatusDefinitions({
      category: "unstarted",
      definitionIds: ["issue-ready", "issue-started"],
      entityType: "issue",
      expectedConfiguration: configuration,
    })).toThrow("exact permutation of issue.unstarted");
    expect(test.submitted).toEqual([]);
  });

  it("deletes a default referenced Status only after explicit default and reference choices", async () => {
    const configuration = configurationWithReadyStatus();
    const test = harness(configuration, ["command-delete"]);

    expect(test.application.deleteStatusDefinition({
      expectedConfiguration: configuration,
      statusDefinitionId: "issue-unstarted",
    })).toMatchObject({
      kind: "needs-input",
      input: { code: "status-default-replacement-required" },
    });
    expect(test.application.deleteStatusDefinition({
      expectedConfiguration: configuration,
      newDefaultStatusDefinitionId: "issue-ready",
      statusDefinitionId: "issue-unstarted",
    })).toMatchObject({
      kind: "needs-input",
      input: { code: "status-reference-replacement-required" },
    });
    expect(test.submitted).toEqual([]);

    const result = test.application.deleteStatusDefinition({
      expectedConfiguration: configuration,
      newDefaultStatusDefinitionId: "issue-ready",
      replacementStatusDefinitionId: "issue-ready",
      statusDefinitionId: "issue-unstarted",
    });
    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;

    const plan = test.submitted[0];
    if (plan === undefined) throw new Error("Expected submitted delete plan");
    const configurationEffect = requireConfigurationEffect(plan);
    expect(configurationEffect.after.workflowStatuses.issue.unstarted).toEqual({
      defaultId: "issue-ready",
      definitionIds: ["issue-ready"],
    });
    expect(configurationEffect.after.statusDefinitions.some(({ id }) => id === "issue-unstarted"))
      .toBe(false);

    const entityEffects = plan.effects.filter(
      (effect): effect is ReplaceEntityEffect => effect.kind === "replace-entity",
    );
    expect(entityEffects).toHaveLength(1);
    expect(entityEffects[0]?.after).toMatchObject({
      kind: "issue",
      value: {
        id: test.issue.id,
        statusDefinitionId: "issue-ready",
        title: test.issue.title,
      },
    });
  });

  it("does not allow deleting the last Status in a fixed Category", () => {
    const configuration = createTrailTestConfiguration();
    const test = harness(configuration);

    expect(() => test.application.deleteStatusDefinition({
      expectedConfiguration: configuration,
      statusDefinitionId: "issue-backlog",
    })).toThrow("Cannot delete the last StatusDefinition in issue.backlog");
    expect(test.submitted).toEqual([]);
  });
});
