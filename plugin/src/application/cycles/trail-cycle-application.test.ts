import { describe, expect, it } from "vitest";

import type { TrailCycle, TrailProject, TrailWorkflowIssue } from "../../domain/model/trail-entities";
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
import { TrailCycleApplication } from "./trail-cycle-application";

function harness() {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 1,
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Issue A",
  };
  const cycle: TrailCycle = {
    id: "cycle-a",
    issueIds: [issue.id],
    plannedEnd: 1_800_100_000_000,
    startedAt: 1_800_000_000_000,
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [issue],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        cycles: [cycle],
        kind: "cycles",
        sourcePath: "Trail/Collections/Cycles.md",
      },
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
  let id = 0;
  const application = new TrailCycleApplication(runtimeStore, sourceSync, {
    createId: () => `command-${id += 1}`,
    now: () => 1_800_050_000_000,
  });
  return { application, cycle, submitted };
}

describe("TrailCycleApplication", () => {
  it("changes planned end through the canonical Cycle replace intent", async () => {
    const { application, cycle, submitted } = harness();
    const result = application.changePlannedEnd(cycle, cycle.plannedEnd + 86_400_000);

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    await result.receipt.completion;

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({
      intent: "planning.cycle.change-planned-end",
      effects: [{
        after: {
          kind: "cycle",
          value: { id: cycle.id, plannedEnd: cycle.plannedEnd + 86_400_000 },
        },
        before: { kind: "cycle", value: cycle },
        kind: "replace-entity",
      }],
    });
  });

  it("does not submit an unchanged planned end", () => {
    const { application, cycle, submitted } = harness();
    expect(application.changePlannedEnd(cycle, cycle.plannedEnd)).toEqual({
      entityId: cycle.id,
      kind: "unchanged",
    });
    expect(submitted).toEqual([]);
  });
});
