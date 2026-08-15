import { describe, expect, it } from "vitest";

import { createDefaultTrailPluginData } from "../../domain/trail-configuration";
import type { TrailProject } from "../../domain/trail-project";
import {
  normalizeChangeWorkflowIssueStatusCommand,
  normalizeCreateWorkflowIssueCommand,
  planChangeWorkflowIssueStatus,
  planCreateWorkflowIssue,
} from "./trail-workflow-issue-application";

function configuration() {
  let id = 0;
  return createDefaultTrailPluginData({
    createId: () => `status-${++id}`,
    timezone: "UTC",
  }).configuration;
}
function environment(ids: string[], now: number) {
  return { createId: () => ids.shift() ?? "unexpected-id", now: () => now };
}

describe("Workflow Issue Application planning", () => {
  it("creates Backlog Issues with immutable creation time", () => {
    const config = configuration();
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: config.statuses.project.unstarted.defaultId,
      title: "Trail Workflow",
    };
    const result = planCreateWorkflowIssue(
      normalizeCreateWorkflowIssueCommand(
        project.id,
        "Implement status flow",
        environment(["command-a", "issue-a"], 250),
      ),
      config,
      project,
      new Set([project.id]),
    );
    expect(result).toMatchObject({
      issue: {
        context: "workflow",
        createdAt: 250,
        id: "issue-a",
        projectId: "project-a",
        statusDefinitionId: config.statuses.issue.backlog.defaultId,
      },
      kind: "ready",
      plan: { intent: "workflow.issue.create" },
    });
  });

  it("maintains lifecycle timestamps and requires Estimate before Completed", () => {
    const config = configuration();
    const backlog = config.statuses.issue.backlog.defaultId;
    const started = config.statuses.issue.started.defaultId;
    const completed = config.statuses.issue.completed.defaultId;
    const unstarted = config.statuses.issue.unstarted.defaultId;
    const base = {
      context: "workflow" as const,
      createdAt: 100,
      id: "issue-a",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: backlog,
      title: "Lifecycle",
    };
    const startedResult = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        base, started, undefined, environment(["command-start"], 200),
      ),
      config,
      base,
    );
    expect(startedResult).toMatchObject({
      issue: { firstStartedAt: 200, statusDefinitionId: started },
      kind: "ready",
    });
    if (startedResult.kind !== "ready") throw new Error("expected started issue");

    const needsEstimate = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        startedResult.issue, completed, undefined, environment(["command-complete"], 300),
      ),
      config,
      startedResult.issue,
    );
    expect(needsEstimate).toEqual({ kind: "needs-input", requiredInput: "estimate" });

    const completedResult = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        startedResult.issue, completed, 3, environment(["command-complete-2"], 300),
      ),
      config,
      startedResult.issue,
    );
    expect(completedResult).toMatchObject({
      issue: {
        estimate: 3,
        firstStartedAt: 200,
        statusDefinitionId: completed,
        terminalAt: 300,
      },
      kind: "ready",
    });
    if (completedResult.kind !== "ready") throw new Error("expected completed issue");

    const reopened = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        completedResult.issue, unstarted, undefined, environment(["command-reopen"], 400),
      ),
      config,
      completedResult.issue,
    );
    expect(reopened).toMatchObject({
      issue: { firstStartedAt: 200, statusDefinitionId: unstarted, terminalAt: undefined },
      kind: "ready",
    });
  });
});
