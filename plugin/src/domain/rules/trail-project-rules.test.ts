import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { resolveTrailStatusDefinition } from "./trail-status-rules";
import {
  canTrailProjectAcceptWorkflowIssue,
  canTrailProjectAssignWorkflowIssueMilestone,
  canTrailProjectChangeWorkflowIssueStatus,
  canTrailProjectDeleteWorkflowIssue,
  canTrailProjectEditWorkflowIssuePlanningFields,
} from "./trail-project-rules";

function status(entityType: "issue" | "project", id: string) {
  const configuration = createTrailTestConfiguration();
  const definition = resolveTrailStatusDefinition(configuration, entityType, id);
  if (definition === undefined) throw new Error(`Missing test StatusDefinition: ${id}`);
  return definition;
}

describe("Project-scoped Workflow Issue rules", () => {
  it("accepts new Issue membership only in lifecycle-compatible Project contexts", () => {
    const projectUnstarted = status("project", "project-unstarted");
    const projectStarted = status("project", "project-started");
    const projectCompleted = status("project", "project-completed");
    const projectCanceled = status("project", "project-canceled");
    const issueBacklog = status("issue", "issue-backlog");
    const issueUnstarted = status("issue", "issue-unstarted");
    const issueCompleted = status("issue", "issue-completed");

    expect(canTrailProjectAcceptWorkflowIssue(projectUnstarted, issueBacklog)).toBe(true);
    expect(canTrailProjectAcceptWorkflowIssue(projectUnstarted, issueUnstarted)).toBe(false);
    expect(canTrailProjectAcceptWorkflowIssue(projectUnstarted, issueCompleted)).toBe(false);

    expect(canTrailProjectAcceptWorkflowIssue(projectStarted, issueBacklog)).toBe(true);
    expect(canTrailProjectAcceptWorkflowIssue(projectStarted, issueUnstarted)).toBe(true);
    expect(canTrailProjectAcceptWorkflowIssue(projectStarted, issueCompleted)).toBe(true);

    expect(canTrailProjectAcceptWorkflowIssue(projectCompleted, issueBacklog)).toBe(false);
    expect(canTrailProjectAcceptWorkflowIssue(projectCompleted, issueCompleted)).toBe(false);
    expect(canTrailProjectAcceptWorkflowIssue(projectCanceled, issueBacklog)).toBe(false);
    expect(canTrailProjectAcceptWorkflowIssue(projectCanceled, issueCompleted)).toBe(false);
  });

  it("permits ordinary planning, Milestone, and delete mutations only where Project lifecycle allows", () => {
    const projectUnstarted = status("project", "project-unstarted");
    const projectStarted = status("project", "project-started");
    const projectCompleted = status("project", "project-completed");
    const projectCanceled = status("project", "project-canceled");
    const issueBacklog = status("issue", "issue-backlog");
    const issueUnstarted = status("issue", "issue-unstarted");
    const issueCompleted = status("issue", "issue-completed");

    const ordinaryCapabilities = [
      canTrailProjectEditWorkflowIssuePlanningFields,
      canTrailProjectAssignWorkflowIssueMilestone,
      canTrailProjectDeleteWorkflowIssue,
    ];
    for (const capability of ordinaryCapabilities) {
      expect(capability(projectUnstarted, issueBacklog)).toBe(true);
      expect(capability(projectUnstarted, issueUnstarted)).toBe(false);
      expect(capability(projectStarted, issueBacklog)).toBe(true);
      expect(capability(projectStarted, issueUnstarted)).toBe(true);
      expect(capability(projectStarted, issueCompleted)).toBe(true);
      expect(capability(projectCompleted, issueCompleted)).toBe(false);
      expect(capability(projectCanceled, issueBacklog)).toBe(false);
    }
  });

  it("keeps Unstarted Projects in Backlog planning while allowing cancellation cleanup", () => {
    const projectUnstarted = status("project", "project-unstarted");
    const issueBacklog = status("issue", "issue-backlog");
    const issueUnstarted = status("issue", "issue-unstarted");
    const issueStarted = status("issue", "issue-started");
    const issueCompleted = status("issue", "issue-completed");
    const issueCanceled = status("issue", "issue-canceled");

    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectUnstarted,
      issueBacklog,
      issueBacklog,
    )).toBe(true);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectUnstarted,
      issueBacklog,
      issueUnstarted,
    )).toBe(false);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectUnstarted,
      issueUnstarted,
      issueStarted,
    )).toBe(false);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectUnstarted,
      issueUnstarted,
      issueCompleted,
    )).toBe(false);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectUnstarted,
      issueUnstarted,
      issueCanceled,
    )).toBe(true);
  });

  it("allows ordinary Status changes only in Started Projects and cancellation cleanup in Canceled Projects", () => {
    const projectStarted = status("project", "project-started");
    const projectCompleted = status("project", "project-completed");
    const projectCanceled = status("project", "project-canceled");
    const issueBacklog = status("issue", "issue-backlog");
    const issueStarted = status("issue", "issue-started");
    const issueCompleted = status("issue", "issue-completed");
    const issueCanceled = status("issue", "issue-canceled");

    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectStarted,
      issueBacklog,
      issueStarted,
    )).toBe(true);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectStarted,
      issueCompleted,
      issueBacklog,
    )).toBe(true);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectCompleted,
      issueCompleted,
      issueBacklog,
    )).toBe(false);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectCanceled,
      issueStarted,
      issueCanceled,
    )).toBe(true);
    expect(canTrailProjectChangeWorkflowIssueStatus(
      projectCanceled,
      issueCompleted,
      issueCanceled,
    )).toBe(false);
  });
});
