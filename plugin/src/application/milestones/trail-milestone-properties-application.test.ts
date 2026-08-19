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
import { TrailMilestoneApplication } from "./trail-milestone-application";

function harness() {
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const milestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [milestone],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
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
  const application = new TrailMilestoneApplication(runtimeStore, sourceSync, {
    createId: () => `command-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, milestone, submitted };
}

describe("TrailMilestoneApplication planning properties", () => {
  it("normalizes the Milestone details snapshot and avoids a no-op submission", async () => {
    const changed = harness();
    const result = changed.application.editProperties(changed.milestone, {
      description: "\r\n  Checkpoint notes  \r\n",
      due: 500,
      title: "  Updated Milestone  ",
    });

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(changed.submitted).toHaveLength(1);
    expect(changed.submitted[0]).toMatchObject({
      intent: "workflow.milestone.edit-properties",
      effects: [{
        after: {
          kind: "milestone",
          value: {
            description: "  Checkpoint notes  ",
            due: 500,
            id: changed.milestone.id,
            projectId: changed.milestone.projectId,
            title: "Updated Milestone",
          },
        },
        before: { kind: "milestone", value: changed.milestone },
        kind: "replace-entity",
      }],
    });

    const unchanged = harness();
    expect(unchanged.application.editProperties(unchanged.milestone, {
      title: " Milestone A ",
    })).toEqual({ entityId: unchanged.milestone.id, kind: "unchanged" });
    expect(unchanged.submitted).toEqual([]);
  });
});
