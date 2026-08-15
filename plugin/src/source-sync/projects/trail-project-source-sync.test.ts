import { describe, expect, it } from "vitest";

import { TrailWorkflowIssueApplication } from "../../application/issues/trail-workflow-issue-application";
import { TrailProjectApplication } from "../../application/projects/trail-project-application";
import { createDefaultTrailPluginData } from "../../domain/trail-configuration";
import {
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "../../domain/trail-issue";
import { sameTrailProject, type TrailProject } from "../../domain/trail-project";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import type { TrailProjectSourceResult } from "../../persistence/domain-sources/trail-source-result";
import type {
  TrailWorkflowPersistence,
  TrailWorkflowSnapshot,
} from "../../persistence/domain-sources/trail-workflow-persistence";
import {
  selectEffectiveProjectById,
  selectEffectiveWorkflowIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailProjectSourceSync } from "./trail-project-source-sync";

function createConfiguration() {
  let id = 0;
  return createDefaultTrailPluginData({
    createId: () => "status-" + String(id += 1),
    timezone: "UTC",
  }).configuration;
}

class MemoryWorkflowPersistence implements TrailWorkflowPersistence {
  private readonly issuesByPath = new Map<string, Map<string, TrailWorkflowIssue>>();
  private readonly projectsByPath = new Map<string, TrailProject>();
  private readonly invalidPaths = new Set<string>();

  public async appendIssue(
    filePath: string,
    expectedProject: TrailProject,
    issue: TrailWorkflowIssue,
  ): Promise<TrailProjectSourceResult> {
    const project = this.projectsByPath.get(filePath);
    if (project === undefined || !sameTrailProject(project, expectedProject)) {
      throw new Error("project changed");
    }
    const issues = this.issuesByPath.get(filePath) ?? new Map<string, TrailWorkflowIssue>();
    issues.set(issue.id, issue);
    this.issuesByPath.set(filePath, issues);
    return this.readSource(filePath);
  }

  public async createProjectAtPath(
    filePath: string,
    project: TrailProject,
  ): Promise<TrailProjectSourceResult> {
    this.projectsByPath.set(filePath, project);
    this.issuesByPath.set(filePath, new Map());
    return this.readSource(filePath);
  }

  public async deleteIssue(
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
  ): Promise<TrailProjectSourceResult> {
    const issues = this.issuesByPath.get(filePath);
    const current = issues?.get(expectedIssue.id);
    if (current === undefined || !sameTrailWorkflowIssue(current, expectedIssue)) {
      throw new Error("issue changed");
    }
    issues?.delete(expectedIssue.id);
    return this.readSource(filePath);
  }

  public async listProjectSources() {
    return [...this.projectsByPath.keys()].sort().map((filePath) => ({
      kind: "file" as const,
      name: filePath.split("/").pop() ?? filePath,
      path: filePath,
    }));
  }

  public async readAll(): Promise<TrailWorkflowSnapshot> {
    return {
      projectResults: await Promise.all(
        [...this.projectsByPath.keys()].sort().map((filePath) => this.readSource(filePath)),
      ),
      structuralIssues: [],
    };
  }

  public async readSource(filePath: string): Promise<TrailProjectSourceResult> {
    if (this.invalidPaths.has(filePath)) {
      return {
        issues: [{
          code: "test.invalid-source",
          filePath,
          message: "invalid fixture",
          scope: "file",
        }],
      };
    }
    const project = this.projectsByPath.get(filePath);
    if (project === undefined) throw new Error("missing source: " + filePath);
    return {
      contribution: {
        filePath,
        issuesById: Object.fromEntries(this.issuesByPath.get(filePath) ?? []),
        project,
      },
      issues: [],
    };
  }

  public async updateIssue(
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    issue: TrailWorkflowIssue,
  ): Promise<TrailProjectSourceResult> {
    const issues = this.issuesByPath.get(filePath);
    const current = issues?.get(expectedIssue.id);
    if (current === undefined || !sameTrailWorkflowIssue(current, expectedIssue)) {
      throw new Error("issue changed");
    }
    issues?.set(issue.id, issue);
    return this.readSource(filePath);
  }

  public makeInvalid(filePath: string): void {
    this.invalidPaths.add(filePath);
  }
}

describe("Project Source Sync integration", () => {
  it("resolves optimistic Project and Issue mutations to the authoritative source", async () => {
    const configuration = createConfiguration();
    const persistence = new MemoryWorkflowPersistence();
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const ids = ["command-project", "project-a", "command-issue", "issue-a", "command-start"];
    const environment = { createId: () => ids.shift() ?? "unexpected", now: () => 100 };
    const sourceSync = new TrailProjectSourceSync(store, queue, persistence, configuration);
    const projects = new TrailProjectApplication(store, sourceSync, configuration, environment);
    const issues = new TrailWorkflowIssueApplication(store, sourceSync, configuration, environment);
    await sourceSync.initialize();

    const projectReceipt = projects.create("Trail Workflow");
    expect(selectEffectiveProjectById(store.getState(), projectReceipt.entityId)).toMatchObject({
      id: "project-a",
      title: "Trail Workflow",
    });
    const issueReceipt = issues.create("project-a", "Implement workflow");
    expect(selectEffectiveWorkflowIssueById(store.getState(), issueReceipt.entityId)).toMatchObject({
      id: "issue-a",
      statusDefinitionId: configuration.statuses.issue.backlog.defaultId,
    });
    await Promise.all([projectReceipt.completion, issueReceipt.completion]);

    const issue = selectEffectiveWorkflowIssueById(store.getState(), "issue-a");
    if (issue === undefined) throw new Error("missing Workflow Issue");
    await issues.changeStatus(
      issue,
      configuration.statuses.issue.started.defaultId,
    ).completion;
    expect(store.getState().committed.authoritative.domain.issuesById["issue-a"]).toMatchObject({
      firstStartedAt: 100,
      statusDefinitionId: configuration.statuses.issue.started.defaultId,
    });
    expect(store.getState().committed.ownership.sourceByEntityId["project-a"]).toBe(
      "Trail/Projects/0001 Trail Workflow.md",
    );
    expect(store.getState().committed.ownership.sourceByEntityId["issue-a"]).toBe(
      "Trail/Projects/0001 Trail Workflow.md",
    );
  });

  it("keeps last-known-good state when an external Project source becomes invalid", async () => {
    const configuration = createConfiguration();
    const persistence = new MemoryWorkflowPersistence();
    const store = createTrailRuntimeStore();
    const queue = new TrailMutationQueue();
    const ids = ["command-project", "project-a", "command-issue", "issue-a"];
    const environment = { createId: () => ids.shift() ?? "unexpected", now: () => 100 };
    const sourceSync = new TrailProjectSourceSync(store, queue, persistence, configuration);
    const projects = new TrailProjectApplication(store, sourceSync, configuration, environment);
    const issues = new TrailWorkflowIssueApplication(store, sourceSync, configuration, environment);
    await sourceSync.initialize();
    await projects.create("Trail Workflow").completion;
    await issues.create("project-a", "Keep me").completion;
    const sourcePath = store.getState().committed.ownership.sourceByEntityId["project-a"];
    if (sourcePath === undefined) throw new Error("missing Project source");

    persistence.makeInvalid(sourcePath);
    await sourceSync.refreshSource(sourcePath);

    expect(store.getState().committed.authoritative.domain.issuesById["issue-a"].title).toBe("Keep me");
    expect(store.getState().health.sourceIssuesByPath[sourcePath]?.length).toBeGreaterThan(0);
  });
});
