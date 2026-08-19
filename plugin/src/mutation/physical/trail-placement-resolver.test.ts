import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { buildTrailCommittedRuntimeCandidate } from "../../runtime/reconcile/trail-runtime-reconciler";
import { resolveTrailDesiredEntityPlacement } from "./trail-placement-resolver";

const projectA = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};

describe("Trail placement resolver", () => {
  it("uses relationships for new/moved records and ownership for their parent source", async () => {
    const committed = { ...buildTrailCommittedRuntimeCandidate({
      pluginData: {
        configuration: createTrailTestConfiguration(),
        workspaceState: createTrailTestWorkspaceState(),
      },
      sources: [{
        issues: [],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project A.md",
      }],
    }), revision: 1 };
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
    }, committed, { list: async () => [] });
    expect(placement).toEqual({
      path: "Trail/Projects/0001 Project A.md",
      sourceKind: "project",
    });
  });

  it("places project-less Workflow Issues in the canonical shared carrier", async () => {
    const committed = { ...buildTrailCommittedRuntimeCandidate({
      pluginData: {
        configuration: createTrailTestConfiguration(),
        workspaceState: createTrailTestWorkspaceState(),
      },
      sources: [{
        issues: [],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Project A.md",
      }],
    }), revision: 1 };
    const placement = await resolveTrailDesiredEntityPlacement({
      kind: "issue",
      value: {
        context: "workflow",
        createdAt: 1,
        id: "issue-projectless",
        labelIds: [],
        statusDefinitionId: "issue-backlog",
        title: "Loose work",
      },
    }, committed, { list: async () => [] });
    expect(placement).toEqual({
      path: "Trail/Collections/Projectless Issues.md",
      sourceKind: "projectless-issues",
    });
  });
});
