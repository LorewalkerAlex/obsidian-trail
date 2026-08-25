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
import { TrailIssueApplication } from "./trail-issue-application";

function harness() {
  const configuration = createTrailTestConfiguration();
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue = {
    context: "workflow" as const,
    createdAt: 10,
    id: "issue-a",
    labelIds: [] as string[],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: { configuration, workspaceState: createTrailTestWorkspaceState() },
    sources: [
      {
        issues: [issue],
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
  const application = new TrailIssueApplication(runtimeStore, sourceSync, {
    createId: () => `command-${nextId += 1}`,
    now: () => 1_000,
  });
  return { application, issue, submitted };
}

describe("TrailIssueApplication planning properties", () => {
  it("normalizes editable input and submits one identity-preserving Replace", async () => {
    const test = harness();
    const result = test.application.editProperties(test.issue, {
      description: "\r\n  Planning notes  \r\n",
      due: 500,
      estimate: 3,
      labelIds: [" label-work "],
      priority: "high",
      title: "  Updated Issue  ",
    });

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;
    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]).toMatchObject({
      intent: "workflow.issue.edit-properties",
      effects: [{
        after: {
          kind: "issue",
          value: {
            description: "  Planning notes  ",
            due: 500,
            estimate: 3,
            id: test.issue.id,
            labelIds: ["label-work"],
            priority: "high",
            projectId: test.issue.projectId,
            statusDefinitionId: test.issue.statusDefinitionId,
            title: "Updated Issue",
          },
        },
        before: { kind: "issue", value: test.issue },
        kind: "replace-entity",
      }],
    });
  });

  it("returns unchanged without submitting when the normalized snapshot matches", () => {
    const test = harness();
    expect(test.application.editProperties(test.issue, {
      labelIds: [],
      title: " Issue A ",
    })).toEqual({ entityId: test.issue.id, kind: "unchanged" });
    expect(test.submitted).toEqual([]);
  });
});
