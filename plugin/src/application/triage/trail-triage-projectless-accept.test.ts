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
  const project = {
    id: "project-a",
    labelIds: [] as string[],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
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
  return { application, project, submitted, triage };
}

describe("TrailTriageApplication explicit-Project Accept", () => {
  it("submits the target Project as canonical Workflow ownership", async () => {
    const test = harness();
    const receipt = test.application.accept(test.triage, test.project.id);
    await receipt.completion;

    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]).toMatchObject({
      intent: "triage.accept",
      effects: [
        {
          after: {
            kind: "issue",
            value: {
              context: "workflow",
              projectId: test.project.id,
              title: "Captured",
            },
          },
          kind: "create-entity",
        },
        { before: { kind: "issue", value: test.triage }, kind: "delete-entity" },
      ],
    });
    expect(test.submitted[0]?.preconditions).toContainEqual({
      entity: { kind: "project", value: test.project },
      kind: "entity-equals",
    });
  });
});
