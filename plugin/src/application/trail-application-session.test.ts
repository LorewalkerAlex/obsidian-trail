import { describe, expect, it } from "vitest";

import type { TrailTriageIssue, TrailWorkflowIssue } from "../domain/model/trail-entities";
import type { TrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import { buildTrailCommittedRuntimeCandidate, publishTrailCommittedRuntime } from "../runtime/reconcile/trail-runtime-reconciler";
import { createTrailRuntimeStore, setTrailRuntimeControl } from "../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../test/trail-test-fixtures";
import { TrailApplicationUnavailableError } from "./trail-application-support";
import { createTrailApplicationSession } from "./trail-application-session";

function createHarness() {
  const triage: TrailTriageIssue = {
    context: "triage",
    due: 100,
    id: "triage-a",
    labelIds: [],
    title: "Captured",
  };
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const workflow: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const runtimeStore = createTrailRuntimeStore();
  const committed = buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      {
        issues: [workflow],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      { issues: [], kind: "projectless-issues", sourcePath: "Trail/Collections/Projectless Issues.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
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
  const session = createTrailApplicationSession({
    environment: {
      createId: () => `generated-${next += 1}`,
      now: () => 1_800_000_000_000,
    },
    runtimeStore,
    sourceSync,
  });
  return { project, runtimeStore, session, submitted, triage, workflow };
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
      expect(effect.after.value.due).toBeGreaterThan(1_800_000_000_000);
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

  it("returns NeedsInput before submitting Completed without an Estimate", () => {
    const harness = createHarness();
    const result = harness.session.issues.changeStatus(
      harness.workflow,
      "issue-completed",
    );
    expect(result).toMatchObject({ kind: "needs-input", input: { code: "estimate-required" } });
    expect(harness.submitted).toEqual([]);
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
});
