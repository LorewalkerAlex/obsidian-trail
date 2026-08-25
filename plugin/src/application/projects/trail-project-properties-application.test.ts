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
import { TrailProjectApplication } from "./trail-project-application";

function harness() {
  const configuration = createTrailTestConfiguration();
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
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
  const application = new TrailProjectApplication(runtimeStore, sourceSync, {
    createId: () => `command-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, project, submitted };
}

describe("TrailProjectApplication planning properties", () => {
  it("normalizes editable input and submits one identity-preserving Replace", async () => {
    const test = harness();
    const result = test.application.editProperties(test.project, {
      description: "\r\n  Outcome notes  \r\n",
      due: 500,
      labelIds: [" label-work "],
      priority: "high",
      title: "  Updated Project  ",
    });

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]).toMatchObject({
      intent: "workflow.project.edit-properties",
      effects: [{
        after: {
          kind: "project",
          value: {
            description: "  Outcome notes  ",
            due: 500,
            id: test.project.id,
            labelIds: ["label-work"],
            priority: "high",
            statusDefinitionId: test.project.statusDefinitionId,
            title: "Updated Project",
          },
        },
        before: { kind: "project", value: test.project },
        kind: "replace-entity",
      }],
    });
  });

  it("returns unchanged without submitting when the normalized snapshot matches", () => {
    const test = harness();
    expect(test.application.editProperties(test.project, {
      labelIds: [],
      title: " Project A ",
    })).toEqual({ entityId: test.project.id, kind: "unchanged" });
    expect(test.submitted).toEqual([]);
  });
});
