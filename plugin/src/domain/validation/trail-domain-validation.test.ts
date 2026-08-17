import { describe, expect, it } from "vitest";
import type { TrailIssue } from "../model/trail-entities";
import {
  validateTrailConfiguration,
  validateTrailWorkspaceState,
} from "./trail-configuration-validation";
import { validateTrailIssue } from "./trail-record-validation";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";

describe("Trail domain validation", () => {
  it("accepts the frozen Configuration and Workspace State contracts", () => {
    expect(validateTrailConfiguration(createTrailTestConfiguration())).toEqual([]);
    expect(validateTrailWorkspaceState(createTrailTestWorkspaceState())).toEqual([]);
  });

  it("rejects invalid configuration references instead of inventing defaults", () => {
    const valid = createTrailTestConfiguration();
    const invalid = {
      ...valid,
      workflowStatuses: {
        ...valid.workflowStatuses,
        issue: {
          ...valid.workflowStatuses.issue,
          backlog: {
            defaultId: "missing-status",
            definitionIds: valid.workflowStatuses.issue.backlog.definitionIds,
          },
        },
      },
    };

    expect(validateTrailConfiguration(invalid).map((issue) => issue.code)).toContain(
      "status.default.invalid",
    );
  });

  it("keeps context-conditioned Issue invariants in Domain validation", () => {
    const invalid = {
      context: "workflow",
      createdAt: -1,
      id: "issue-a",
      labelIds: [],
      statusDefinitionId: "status-a",
      title: "Issue",
    } as TrailIssue;

    expect(validateTrailIssue(invalid).map((issue) => issue.code)).toContain(
      "workflow.created-at.invalid",
    );
  });
});
