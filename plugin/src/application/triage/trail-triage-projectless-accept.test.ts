import { describe, expect, it } from "vitest";

import type { TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
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
import { TrailTriageApplication } from "./trail-triage-application";

function harness() {
  const triage = {
    context: "triage" as const,
    due: 100,
    id: "triage-a",
    labelIds: [] as string[],
    title: "Captured",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      { issues: [], kind: "projectless-issues", sourcePath: "Trail/Collections/Projectless Issues.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
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
  const application = new TrailTriageApplication(runtimeStore, sourceSync, {
    createId: () => `generated-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, submitted, triage };
}

describe("TrailTriageApplication project-less Accept", () => {
  it("preserves the Domain's optional Project contract at the Application boundary", async () => {
    const test = harness();
    const receipt = test.application.accept(test.triage);
    await receipt.completion;

    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]).toMatchObject({
      intent: "triage.accept",
      effects: [
        {
          after: {
            kind: "issue",
            value: { context: "workflow", title: "Captured" },
          },
          kind: "create-entity",
        },
        { before: { kind: "issue", value: test.triage }, kind: "delete-entity" },
      ],
    });
    expect(test.submitted[0]?.preconditions.some((precondition) => (
      precondition.kind === "entity-equals" && precondition.entity.kind === "project"
    ))).toBe(false);
    const createEffect = test.submitted[0]?.effects[0];
    expect(createEffect?.kind).toBe("create-entity");
    if (createEffect?.kind === "create-entity" && createEffect.after.kind === "issue") {
      expect(createEffect.after.value).not.toHaveProperty("projectId");
    }
  });
});
