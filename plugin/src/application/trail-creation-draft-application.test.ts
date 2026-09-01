import { describe, expect, it } from "vitest";

import type { TrailTriageIssue } from "../domain/model/trail-entities";
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
import { createTrailApplicationSession } from "./trail-application-session";

function harness() {
  const initiative = {
    id: "initiative-a",
    labelIds: [] as string[],
    title: "Initiative A",
  };
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
  const triage: TrailTriageIssue = {
    context: "triage",
    description: "Source body",
    due: 100,
    id: "triage-a",
    labelIds: ["label-work"],
    priority: "high",
    title: "Source title",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      { initiative, kind: "initiative", sourcePath: "Trail/Initiatives/0001 Initiative A.md" },
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      {
        issues: [],
        kind: "project",
        milestones: [milestone],
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
  const session = createTrailApplicationSession({
    environment: {
      createId: () => `generated-${nextId += 1}`,
      now: () => 1_000,
    },
    runtimeStore,
    sourceSync,
  });
  return { initiative, milestone, project, session, submitted, triage };
}

describe("standard creation Application drafts", () => {
  it("submits the complete Workflow Issue Composer draft as one Create", async () => {
    const test = harness();
    const receipt = test.session.issues.createFromDraft({
      description: "Issue body",
      due: 2_000,
      estimate: "medium",
      labelIds: ["label-work"],
      milestoneId: test.milestone.id,
      priority: "urgent",
      projectId: test.project.id,
      title: "  Issue title  ",
    });
    await receipt.completion;

    expect(receipt.entityId).toBe("generated-2");
    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]?.effects).toEqual([{
      after: {
        kind: "issue",
        value: {
          context: "workflow",
          createdAt: 1_000,
          description: "Issue body",
          due: 2_000,
          estimate: "medium",
          id: "generated-2",
          labelIds: ["label-work"],
          milestoneId: test.milestone.id,
          priority: "urgent",
          projectId: test.project.id,
          statusDefinitionId: "issue-backlog",
          title: "Issue title",
        },
      },
      kind: "create-entity",
    }]);
  });

  it("submits the complete Project Composer draft as one Create", async () => {
    const test = harness();
    const receipt = test.session.projects.createFromDraft({
      description: "Project body",
      due: 3_000,
      initiativeId: test.initiative.id,
      labelIds: ["label-work"],
      priority: "high",
      title: "  Project title  ",
    });
    await receipt.completion;

    expect(receipt.entityId).toBe("generated-2");
    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]?.effects).toEqual([{
      after: {
        kind: "project",
        value: {
          description: "Project body",
          due: 3_000,
          id: "generated-2",
          initiativeId: test.initiative.id,
          labelIds: ["label-work"],
          priority: "high",
          statusDefinitionId: "project-unstarted",
          title: "Project title",
        },
      },
      kind: "create-entity",
    }]);
  });

  it("lets Triage Accept submit an explicit Issue Composer draft", async () => {
    const test = harness();
    const receipt = test.session.triage.acceptFromDraft(test.triage, {
      description: "Chosen body",
      labelIds: [],
      priority: "low",
      projectId: test.project.id,
      title: "Chosen title",
    });
    await receipt.completion;

    expect(test.submitted).toHaveLength(1);
    expect(test.submitted[0]?.effects[0]).toMatchObject({
      after: {
        kind: "issue",
        value: {
          description: "Chosen body",
          labelIds: [],
          priority: "low",
          projectId: test.project.id,
          title: "Chosen title",
        },
      },
      kind: "create-entity",
    });
    expect(test.submitted[0]?.effects[1]).toEqual({
      before: { kind: "issue", value: test.triage },
      kind: "delete-entity",
    });
  });
});
