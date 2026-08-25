import { describe, expect, it } from "vitest";

import type { TrailDomainEntity } from "../../domain/model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { resolveTrailDesiredEntityPlacement } from "./trail-placement-resolver";

const projectA = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};

function committedWithProject() {
  return { ...buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [{
      issues: [],
      kind: "project" as const,
      milestones: [],
      project: projectA,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), revision: 1 };
}

describe("Trail placement resolver", () => {
  it("uses relationships for new/moved records and ownership for their parent source", async () => {
    const placement = await resolveTrailDesiredEntityPlacement({
      kind: "issue",
      value: {
        context: "workflow",
        createdAt: 1,
        id: "issue-a",
        labelIds: [],
        projectId: "project-a",
        statusDefinitionId: "issue-unstarted",
        title: "Issue A",
      },
    }, committedWithProject(), { list: async () => [] });
    expect(placement).toEqual({
      path: "Trail/Projects/0001 Project A.md",
      sourceKind: "project",
    });
  });

  it("fails closed when an invalid Workflow Issue reaches persistence without a Project", async () => {
    const malformed = {
      kind: "issue",
      value: {
        context: "workflow",
        createdAt: 1,
        id: "issue-without-project",
        labelIds: [],
        statusDefinitionId: "issue-backlog",
        title: "Invalid work",
      },
    } as unknown as TrailDomainEntity;

    await expect(resolveTrailDesiredEntityPlacement(
      malformed,
      committedWithProject(),
      { list: async () => [] },
    )).rejects.toThrow(
      "Workflow Issue requires a Project for physical placement",
    );
  });
});
