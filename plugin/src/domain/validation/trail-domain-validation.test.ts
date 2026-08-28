import { describe, expect, it } from "vitest";
import type { TrailConfiguration } from "../model/trail-configuration";
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

    expect(validateTrailConfiguration(invalid).map((item) => item.code)).toContain(
      "status.default.invalid",
    );
  });

  it("rejects Project Backlog when malformed input crosses the typed boundary", () => {
    const valid = createTrailTestConfiguration();
    const invalid = {
      ...valid,
      statusDefinitions: [
        ...valid.statusDefinitions,
        {
          category: "backlog",
          entityType: "project",
          id: "project-backlog",
          name: "Backlog",
        },
      ],
      workflowStatuses: {
        ...valid.workflowStatuses,
        project: {
          ...valid.workflowStatuses.project,
          backlog: {
            defaultId: "project-backlog",
            definitionIds: ["project-backlog"],
          },
        },
      },
    } as unknown as TrailConfiguration;

    const codes = validateTrailConfiguration(invalid).map((item) => item.code);
    expect(codes.filter((code) => code === "status.category.unsupported")).toHaveLength(2);
  });

  it("requires a positive finite aggregation weight for every fixed Estimate level", () => {
    const valid = createTrailTestConfiguration();
    const invalid = {
      ...valid,
      estimateWeights: {
        ...valid.estimateWeights,
        medium: 0,
        xlarge: Number.POSITIVE_INFINITY,
      },
    };

    const codes = validateTrailConfiguration(invalid).map((item) => item.code);
    expect(codes.filter((code) => code === "estimate-weight.invalid")).toHaveLength(2);
  });

  it("rejects a missing Estimate weight mapping at the validation boundary", () => {
    const invalid = {
      ...createTrailTestConfiguration(),
    } as unknown as Record<string, unknown>;
    delete invalid.estimateWeights;

    const codes = validateTrailConfiguration(
      invalid as unknown as TrailConfiguration,
    ).map((item) => item.code);
    expect(codes).toContain("estimate-weight.invalid");
  });

  it("keeps context-conditioned Issue invariants in Domain validation", () => {
    // Deliberately cross the typed boundary to verify malformed persisted/runtime input.
    const invalidWorkflow = {
      context: "workflow",
      createdAt: -1,
      estimate: 3,
      id: "issue-workflow",
      labelIds: [],
      milestoneId: "milestone-a",
      statusDefinitionId: "status-a",
      title: "Workflow Issue",
    } as unknown as TrailIssue;
    const workflowCodes = validateTrailIssue(invalidWorkflow).map((item) => item.code);

    expect(workflowCodes).toContain("estimate.invalid");
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
    const triageCodes = validateTrailIssue(invalidTriage).map((item) => item.code);
    expect(triageCodes).toContain("triage.project.forbidden");
    expect(triageCodes).toContain("triage.milestone.forbidden");

    const missingTriageDue = {
      context: "triage",
      id: "issue-triage-missing-due",
      labelIds: [],
      title: "Triage Issue",
    } as unknown as TrailIssue;
    expect(validateTrailIssue(missingTriageDue).map((item) => item.code)).toContain(
      "triage.due.invalid",
    );
  });
});
