import { describe, expect, it } from "vitest";

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
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { TrailConfigurationApplication } from "./trail-configuration-application";

type ReplaceConfigurationEffect = Extract<TrailStateEffect, { kind: "replace-configuration" }>;
type ReplaceEntityEffect = Extract<TrailStateEffect, { kind: "replace-entity" }>;

function requireReplaceConfigurationEffect(plan: TrailMutationPlan): ReplaceConfigurationEffect {
  const effect = plan.effects.find(
    (candidate): candidate is ReplaceConfigurationEffect => candidate.kind === "replace-configuration",
  );
  if (effect === undefined) throw new Error("Expected replace-configuration effect");
  return effect;
}

function requireReplaceEntityEffect(plan: TrailMutationPlan): ReplaceEntityEffect {
  const effect = plan.effects.find(
    (candidate): candidate is ReplaceEntityEffect => candidate.kind === "replace-entity",
  );
  if (effect === undefined) throw new Error("Expected replace-entity effect");
  return effect;
}

function requireSubmittedPlan(plans: readonly TrailMutationPlan[], index: number): TrailMutationPlan {
  const plan = plans[index];
  if (plan === undefined) throw new Error(`Expected submitted plan at index ${index}`);
  return plan;
}

function harness(createIds: readonly string[] = []) {
  const configuration = createTrailTestConfiguration();
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
    labelIds: ["label-work"],
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
  return { application, configuration, issue, submitted };
}

describe("TrailConfigurationApplication Label management", () => {
  it("creates LabelGroups and Labels through Configuration replacement", async () => {
    const test = harness();
    const groupResult = test.application.createLabelGroup({
      expectedConfiguration: test.configuration,
      name: "  Technology  ",
      registeredEntityTypes: ["issue", "initiative"],
      selectionMode: "multiple",
    });

    expect(groupResult.kind).toBe("submitted");
    if (groupResult.kind !== "submitted") return;
    await groupResult.receipt.completion;
    expect(test.submitted).toHaveLength(1);
    const groupEffect = requireReplaceConfigurationEffect(requireSubmittedPlan(test.submitted, 0));
    expect(groupEffect.after.labelGroups).toContainEqual({
      id: "generated-1",
      name: "Technology",
      registeredEntityTypes: ["initiative", "issue"],
      selectionMode: "multiple",
    });

    const labelResult = test.application.createLabel({
      expectedConfiguration: test.configuration,
      groupId: "group-area",
      name: "  Home  ",
    });
    expect(labelResult.kind).toBe("submitted");
    if (labelResult.kind !== "submitted") return;
    await labelResult.receipt.completion;
    expect(test.submitted).toHaveLength(2);
    const labelEffect = requireReplaceConfigurationEffect(requireSubmittedPlan(test.submitted, 1));
    expect(labelEffect.after.labels).toContainEqual({
      groupId: "group-area",
      id: "generated-3",
      name: "Home",
    });
  });

  it("canonicalizes LabelGroup and Label order before persistence", async () => {
    const groupTest = harness(["group-aaa", "command-group"]);
    const groupResult = groupTest.application.createLabelGroup({
      expectedConfiguration: groupTest.configuration,
      name: "Earlier group",
      registeredEntityTypes: ["issue"],
      selectionMode: "multiple",
    });
    expect(groupResult.kind).toBe("submitted");
    if (groupResult.kind !== "submitted") return;
    await groupResult.receipt.completion;
    const groupEffect = requireReplaceConfigurationEffect(
      requireSubmittedPlan(groupTest.submitted, 0),
    );
    expect(groupEffect.after.labelGroups.map(({ id }) => id)).toEqual([
      "group-aaa",
      "group-area",
    ]);

    const labelTest = harness(["label-alpha", "command-label"]);
    const labelResult = labelTest.application.createLabel({
      expectedConfiguration: labelTest.configuration,
      groupId: "group-area",
      name: "Alpha",
    });
    expect(labelResult.kind).toBe("submitted");
    if (labelResult.kind !== "submitted") return;
    await labelResult.receipt.completion;
    const labelEffect = requireReplaceConfigurationEffect(
      requireSubmittedPlan(labelTest.submitted, 0),
    );
    expect(labelEffect.after.labels.map(({ id }) => id)).toEqual([
      "label-alpha",
      "label-work",
    ]);
  });

  it("requires confirmation before clearing invalid selections after Label deletion", async () => {
    const test = harness();

    const preview = test.application.deleteLabel({
      expectedConfiguration: test.configuration,
      labelId: "label-work",
    });
    expect(preview).toMatchObject({
      kind: "needs-input",
      input: { code: "configuration-reference-resolution-required" },
    });
    expect(test.submitted).toEqual([]);

    const confirmed = test.application.deleteLabel({
      clearInvalidSelections: true,
      expectedConfiguration: test.configuration,
      labelId: "label-work",
    });
    expect(confirmed.kind).toBe("submitted");
    if (confirmed.kind !== "submitted") return;
    await confirmed.receipt.completion;

    expect(test.submitted).toHaveLength(1);
    const submitted = requireSubmittedPlan(test.submitted, 0);
    const configurationEffects = submitted.effects.filter(
      (effect): effect is ReplaceConfigurationEffect => effect.kind === "replace-configuration",
    );
    expect(configurationEffects).toHaveLength(1);
    expect(configurationEffects[0]?.after.labels).toEqual([]);

    const entityEffects = submitted.effects.filter(
      (effect): effect is ReplaceEntityEffect => effect.kind === "replace-entity",
    );
    expect(entityEffects).toHaveLength(1);
    const entityEffect = requireReplaceEntityEffect(submitted);
    expect(entityEffect.after.kind).toBe("issue");
    if (entityEffect.after.kind !== "issue") return;
    expect(entityEffect.after.value).toMatchObject({ id: test.issue.id, labelIds: [] });
  });

  it("clears a conflicting group selection instead of choosing an arbitrary Label", async () => {
    const configuration = {
      ...createTrailTestConfiguration(),
      labelGroups: [{
        id: "group-area",
        name: "Area",
        registeredEntityTypes: ["issue" as const],
        selectionMode: "multiple" as const,
      }],
      labels: [
        { groupId: "group-area", id: "label-work", name: "Work" },
        { groupId: "group-area", id: "label-home", name: "Home" },
      ],
    };
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
      labelIds: ["label-work", "label-home"],
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
    const application = new TrailConfigurationApplication(runtimeStore, {
      async submit(plan) {
        submitted.push(plan);
        return { commandId: plan.commandId, operations: [], topology: "single" };
      },
    }, { createId: () => "command-a", now: () => 1_000 });

    const result = application.editLabelGroup({
      clearInvalidSelections: true,
      expectedConfiguration: configuration,
      groupId: "group-area",
      name: "Area",
      registeredEntityTypes: ["issue"],
      selectionMode: "single",
    });
    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;

    const submittedPlan = requireSubmittedPlan(submitted, 0);
    const entityEffects = submittedPlan.effects.filter(
      (effect): effect is ReplaceEntityEffect => effect.kind === "replace-entity",
    );
    expect(entityEffects).toHaveLength(1);
    const entityEffect = requireReplaceEntityEffect(submittedPlan);
    expect(entityEffect.after.kind).toBe("issue");
    if (entityEffect.after.kind !== "issue") return;
    expect(entityEffect.after.value).toMatchObject({ id: issue.id, labelIds: [] });
  });
});
