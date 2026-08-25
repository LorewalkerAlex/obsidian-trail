import { describe, expect, it } from "vitest";

import type { TrailConfiguration } from "../domain/model/trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../domain/model/trail-entities";
import type { TrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../test/trail-test-fixtures";
import { TrailApplicationUnavailableError } from "./trail-application-support";
import { createTrailApplicationSession } from "./trail-application-session";

interface HarnessOptions {
  readonly includeOpenCycle?: boolean;
}

function createHarness(options: HarnessOptions = {}) {
  const triage: TrailTriageIssue = {
    context: "triage",
    due: 100,
    id: "triage-a",
    labelIds: [],
    title: "Captured",
  };
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB: TrailProject = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const workflow: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const cycle: TrailCycle = {
    id: "cycle-a",
    issueIds: [workflow.id],
    plannedEnd: 500,
    startedAt: 10,
  };
  const configuration = createTrailTestConfiguration();
  const runtimeStore = createTrailRuntimeStore();
  const committed = buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      {
        issues: [workflow],
        kind: "project",
        milestones: [milestone],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      {
        cycles: options.includeOpenCycle === false ? [] : [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
    ],
  });
  publishTrailCommittedRuntime(runtimeStore, committed, { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });
  const submitted: TrailMutationPlan[] = [];
  const sourceSync: TrailAuthoritativeSourceSync = {
    async submit(plan) {
      submitted.push(plan);
      return { commandId: plan.commandId, operations: [], topology: "single" };
    },
  };
  let next = 0;
  const now = 1_800_000_000_000;
  const session = createTrailApplicationSession({
    environment: {
      createId: () => `generated-${next += 1}`,
      now: () => now,
    },
    runtimeStore,
    sourceSync,
  });
  return {
    configuration,
    cycle,
    initiative,
    milestone,
    now,
    project,
    projectB,
    runtimeStore,
    session,
    submitted,
    triage,
    workflow,
  };
}

function replaceProjectUnstartedDefinition(configuration: TrailConfiguration): TrailConfiguration {
  return {
    ...configuration,
    statusDefinitions: configuration.statusDefinitions.map((definition) => (
      definition.id === "project-unstarted"
        ? { ...definition, id: "project-ready", name: "Ready" }
        : definition
    )),
    workflowStatuses: {
      ...configuration.workflowStatuses,
      project: {
        ...configuration.workflowStatuses.project,
        unstarted: {
          defaultId: "project-ready",
          definitionIds: ["project-ready"],
        },
      },
    },
  };
}

describe("Trail Application session", () => {
  it("refuses command planning while Runtime is not ready", () => {
    const harness = createHarness();
    setTrailRuntimeControl(harness.runtimeStore, { kind: "refreshing" });
    expect(() => harness.session.projects.create("Blocked"))
      .toThrow(TrailApplicationUnavailableError);
    expect(harness.submitted).toEqual([]);
  });

  it("normalizes Quick Capture then delegates only a logical plan to Source Sync", async () => {
    const harness = createHarness();
    const receipt = harness.session.triage.capture("  New idea  ");
    await receipt.completion;
    expect(receipt.entityId).toBe("generated-2");
    expect(harness.submitted).toHaveLength(1);
    const effect = harness.submitted[0]?.effects[0];
    expect(effect?.kind).toBe("create-entity");
    if (effect?.kind === "create-entity" && effect.after.kind === "issue") {
      expect(effect.after.value.title).toBe("New idea");
      expect(effect.after.value.context).toBe("triage");
      expect(effect.after.value.due).toBeGreaterThan(harness.now);
    }
  });

  it("keeps Triage Accept as semantic create-new/delete-source intent", async () => {
    const harness = createHarness();
    const receipt = harness.session.triage.accept(harness.triage, harness.project.id);
    await receipt.completion;
    expect(receipt.entityId).toBe("generated-2");
    const effects = harness.submitted[0]?.effects ?? [];
    expect(effects.map(({ kind }) => kind)).toEqual(["create-entity", "delete-entity"]);
  });

  it("keeps Triage Convert to Project as semantic create-new/delete-source intent", async () => {
    const harness = createHarness();
    const receipt = harness.session.triage.convertToProject(harness.triage);
    await receipt.completion;
    expect(receipt.entityId).toBe("generated-2");
    expect(harness.submitted[0]?.intent).toBe("triage.convert-project");
    const effects = harness.submitted[0]?.effects ?? [];
    expect(effects.map(({ kind }) => kind)).toEqual(["create-entity", "delete-entity"]);
    expect(effects[0]).toMatchObject({
      after: {
        kind: "project",
        value: { id: "generated-2", title: "Captured" },
      },
      kind: "create-entity",
    });
  });

  it("returns NeedsInput before submitting Completed without an Estimate", () => {
    const harness = createHarness();
    const result = harness.session.issues.changeStatus(
      harness.workflow,
      "issue-completed",
    );
    expect(result).toMatchObject({ kind: "needs-input", input: { code: "estimate-required" } });
    expect(harness.submitted).toEqual([]);
  });

  it("moves a Workflow Issue through an identity-preserving logical Replace", async () => {
    const harness = createHarness();
    const result = harness.session.issues.moveToProject(harness.workflow, harness.projectB.id);
    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(result.receipt.entityId).toBe(harness.workflow.id);
    expect(harness.submitted[0]?.intent).toBe("workflow.issue.move-project");
    expect(harness.submitted[0]?.effects).toEqual([{
      after: {
        kind: "issue",
        value: { ...harness.workflow, milestoneId: undefined, projectId: harness.projectB.id },
      },
      before: { kind: "issue", value: harness.workflow },
      kind: "replace-entity",
    }]);
  });

  it("creates Projects and Workflow Issues through the same Source Sync boundary", async () => {
    const harness = createHarness();
    const projectReceipt = harness.session.projects.create(" New Project ");
    const issueReceipt = harness.session.issues.create(harness.project.id, " New Issue ");
    await Promise.all([projectReceipt.completion, issueReceipt.completion]);
    expect(harness.submitted.map(({ intent }) => intent)).toEqual([
      "workflow.project.create",
      "workflow.issue.create",
    ]);
  });

  it("requires explicit Project creation and keeps Project/Milestone relation changes explicit", async () => {
    const harness = createHarness();
    const issueReceipt = harness.session.issues.create(harness.projectB.id, " Routed Issue ");
    const milestoneResult = harness.session.issues.changeMilestone(harness.workflow, undefined);
    const projectResult = harness.session.issues.moveToProject(
      harness.workflow,
      harness.projectB.id,
    );

    expect(milestoneResult.kind).toBe("submitted");
    expect(projectResult.kind).toBe("submitted");
    await issueReceipt.completion;
    if (milestoneResult.kind === "submitted") await milestoneResult.receipt.completion;
    if (projectResult.kind === "submitted") await projectResult.receipt.completion;

    expect(harness.submitted.map(({ intent }) => intent)).toEqual([
      "workflow.issue.create",
      "workflow.issue.change-milestone",
      "workflow.issue.move-project",
    ]);
    const createEffect = harness.submitted[0]?.effects[0];
    expect(createEffect?.kind).toBe("create-entity");
    if (createEffect?.kind === "create-entity" && createEffect.after.kind === "issue") {
      expect(createEffect.after.value.title).toBe("Routed Issue");
      expect(createEffect.after.value.projectId).toBe(harness.projectB.id);
    }
  });

  it("exposes Project lifecycle, Initiative membership, and core delete intents", async () => {
    const harness = createHarness();
    const statusResult = harness.session.projects.changeStatus(
      harness.project,
      "project-started",
    );
    const initiativeResult = harness.session.projects.changeInitiative(harness.project, undefined);
    const needsReplacement = harness.session.projects.delete(harness.project);
    const projectDelete = harness.session.projects.delete(harness.project, harness.projectB.id);
    const issueDelete = harness.session.issues.delete(harness.workflow);

    expect(statusResult.kind).toBe("submitted");
    expect(initiativeResult.kind).toBe("submitted");
    expect(needsReplacement).toMatchObject({
      input: { code: "project-replacement-required" },
      kind: "needs-input",
    });
    expect(projectDelete.kind).toBe("submitted");
    if (statusResult.kind === "submitted") await statusResult.receipt.completion;
    if (initiativeResult.kind === "submitted") await initiativeResult.receipt.completion;
    if (projectDelete.kind === "submitted") await projectDelete.receipt.completion;
    await issueDelete.completion;

    expect(harness.submitted.map(({ intent }) => intent)).toEqual([
      "workflow.project.change-status",
      "workflow.project.change-initiative",
      "workflow.project.delete",
      "workflow.issue.delete",
    ]);
    expect(harness.submitted[2]?.effects.map(({ kind }) => kind)).toEqual([
      "replace-entity",
      "delete-entity",
      "delete-entity",
    ]);
    expect(harness.submitted[2]?.effects[0]).toMatchObject({
      after: {
        kind: "issue",
        value: {
          id: harness.workflow.id,
          milestoneId: undefined,
          projectId: harness.projectB.id,
        },
      },
    });
    expect(harness.submitted[3]?.effects.map(({ kind }) => kind)).toEqual([
      "replace-entity",
      "delete-entity",
    ]);
  });

  it("creates and deletes Initiatives and Milestones through their canonical planners", async () => {
    const harness = createHarness();
    const initiativeCreate = harness.session.initiatives.create(" New Initiative ");
    const milestoneCreate = harness.session.milestones.create(
      harness.project.id,
      " New Milestone ",
      2_000,
    );
    const initiativeDelete = harness.session.initiatives.delete(harness.initiative);
    const milestoneDelete = harness.session.milestones.delete(harness.milestone);

    await Promise.all([
      initiativeCreate.completion,
      milestoneCreate.completion,
      initiativeDelete.completion,
      milestoneDelete.completion,
    ]);
    expect(harness.submitted.map(({ intent }) => intent)).toEqual([
      "workflow.initiative.create",
      "workflow.milestone.create",
      "workflow.initiative.delete",
      "workflow.milestone.delete",
    ]);
    expect(initiativeCreate.entityId).toBe("generated-2");
    expect(harness.submitted[2]?.effects.map(({ kind }) => kind)).toEqual([
      "replace-entity",
      "delete-entity",
    ]);
    expect(harness.submitted[3]?.effects.map(({ kind }) => kind)).toEqual([
      "replace-entity",
      "delete-entity",
    ]);
  });

  it("opens a Cycle from normalized inputs when no Current Cycle exists", async () => {
    const harness = createHarness({ includeOpenCycle: false });
    const receipt = harness.session.cycles.open({
      issueIds: [harness.workflow.id],
      plannedEnd: harness.now + 1_000,
    });
    await receipt.completion;

    expect(receipt.entityId).toBe("generated-2");
    expect(harness.submitted).toHaveLength(1);
    expect(harness.submitted[0]).toMatchObject({
      intent: "planning.cycle.open",
      effects: [{
        after: {
          kind: "cycle",
          value: {
            id: "generated-2",
            issueIds: [harness.workflow.id],
            plannedEnd: harness.now + 1_000,
            startedAt: harness.now,
          },
        },
        kind: "create-entity",
      }],
    });
  });

  it("changes, closes, and deletes Cycle state only through logical plans", async () => {
    const harness = createHarness();
    const membership = harness.session.cycles.changeMembership(harness.cycle, []);
    const close = harness.session.cycles.close(harness.cycle);
    const remove = harness.session.cycles.delete(harness.cycle);

    expect(membership.kind).toBe("submitted");
    if (membership.kind === "submitted") await membership.receipt.completion;
    await Promise.all([close.completion, remove.completion]);
    expect(harness.submitted.map(({ intent }) => intent)).toEqual([
      "planning.cycle.change-membership",
      "planning.cycle.close",
      "planning.cycle.delete",
    ]);
  });

  it("submits a legal Configuration replacement through Source Sync", async () => {
    const harness = createHarness();
    const nextConfiguration: TrailConfiguration = {
      ...harness.configuration,
      temporal: {
        ...harness.configuration.temporal,
        dateFormat: "yyyy-MM-dd",
      },
    };
    const result = harness.session.configuration.change({
      expectedConfiguration: harness.configuration,
      nextConfiguration,
    });

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(harness.submitted).toHaveLength(1);
    expect(harness.submitted[0]?.intent).toBe("configuration.change");
    expect(harness.submitted[0]?.effects).toEqual([{
      after: nextConfiguration,
      before: harness.configuration,
      kind: "replace-configuration",
    }]);
  });

  it("returns Configuration reference repair as NeedsInput without submitting", () => {
    const harness = createHarness();
    const result = harness.session.configuration.change({
      expectedConfiguration: harness.configuration,
      nextConfiguration: replaceProjectUnstartedDefinition(harness.configuration),
    });

    expect(result).toMatchObject({
      kind: "needs-input",
      input: { code: "configuration-reference-resolution-required" },
    });
    expect(harness.submitted).toEqual([]);
  });

  it("does not submit an unchanged Configuration", () => {
    const harness = createHarness();
    const result = harness.session.configuration.change({
      expectedConfiguration: harness.configuration,
      nextConfiguration: harness.configuration,
    });

    expect(result).toEqual({ kind: "unchanged" });
    expect(harness.submitted).toEqual([]);
  });
});
