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
import { TrailInitiativeApplication } from "./trail-initiative-application";

function harness() {
  const configuration = createTrailTestConfiguration();
  const initiative = {
    id: "initiative-a",
    labelIds: [] as string[],
    title: "Initiative A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      { issues: [], kind: "projectless-issues", sourcePath: "Trail/Collections/Projectless Issues.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
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
  const application = new TrailInitiativeApplication(runtimeStore, sourceSync, {
    createId: () => `command-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, initiative, submitted };
}

describe("TrailInitiativeApplication planning properties", () => {
  it("normalizes editable input and submits one identity-preserving Replace", async () => {
    const test = harness();
    const result = test.application.editProperties(test.initiative, {
      description: "\r\n  Strategy notes  \r\n",
      due: 500,
      labelIds: [" label-work "],
      priority: "urgent",
      title: "  Updated Initiative  ",
    });

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]).toMatchObject({
      intent: "workflow.initiative.edit-properties",
      effects: [{
        after: {
          kind: "initiative",
          value: {
            description: "  Strategy notes  ",
            due: 500,
            id: test.initiative.id,
            labelIds: ["label-work"],
            priority: "urgent",
            title: "Updated Initiative",
          },
        },
        before: { kind: "initiative", value: test.initiative },
        kind: "replace-entity",
      }],
    });
  });

  it("returns unchanged without submitting when the normalized snapshot matches", () => {
    const test = harness();
    expect(test.application.editProperties(test.initiative, {
      labelIds: [],
      title: " Initiative A ",
    })).toEqual({ entityId: test.initiative.id, kind: "unchanged" });
    expect(test.submitted).toEqual([]);
  });
});
