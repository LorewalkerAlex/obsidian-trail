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
    // Deliberately cross the typed boundary to verify malformed persisted/runtime input.
    const invalidWorkflow = {
      context: "workflow",
      createdAt: -1,
      id: "issue-workflow",
      labelIds: [],
      milestoneId: "milestone-a",
      statusDefinitionId: "status-a",
      title: "Workflow Issue",
    } as unknown as TrailIssue;
    const workflowCodes = validateTrailIssue(invalidWorkflow).map((issue) => issue.code);

    expect(workflowCodes).toContain("workflow.created-at.invalid");
    expect(workflowCodes).toContain("workflow.project.required");
    expect(workflowCodes).toContain("milestone.requires-project");

    const invalidTriage = {
      context: "triage",
      due: 10,
      id: "issue-triage",
      labelIds: [],
      milestoneId: "milestone-a",
      projectId: "project-a",
      title: "Triage Issue",
    } as unknown as TrailIssue;
    const triageCodes = validateTrailIssue(invalidTriage).map((issue) => issue.code);
    expect(triageCodes).toContain("triage.project.forbidden");
    expect(triageCodes).toContain("triage.milestone.forbidden");

    const missingTriageDue = {
      context: "triage",
      id: "issue-triage-missing-due",
      labelIds: [],
      title: "Triage Issue",
    } as unknown as TrailIssue;
    expect(validateTrailIssue(missingTriageDue).map((issue) => issue.code)).toContain(
      "triage.due.invalid",
    );
  });
});
