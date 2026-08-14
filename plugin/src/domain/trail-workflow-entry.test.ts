import { describe, expect, it } from "vitest";

import {
  createDefaultTrailPluginData,
} from "./trail-configuration";
import type { TrailWorkflowIssue } from "./trail-issue";
import { TrailMutationQueue } from "./trail-mutation-queue";
import type { TrailProject } from "./trail-project";
import {
  appendWorkflowIssueToProjectMarkdown,
  parseProjectMarkdown,
  serializeProjectMarkdown,
  updateWorkflowIssueInProjectMarkdown,
  type TrailProjectParseResult,
} from "./trail-project-markdown";
import {
  createTrailRuntimeStore,
  selectEffectiveProjectById,
  selectEffectiveWorkflowIssueById,
} from "./trail-runtime";
import {
  TrailWorkflowEntryService,
  normalizeChangeWorkflowIssueStatusCommand,
  normalizeCreateProjectCommand,
  normalizeCreateWorkflowIssueCommand,
  planChangeWorkflowIssueStatus,
  planCreateProject,
  planCreateWorkflowIssue,
} from "./trail-workflow-entry";
import type {
  TrailWorkflowPersistence,
  TrailWorkflowSnapshot,
} from "./trail-workflow-persistence";

function parseYaml(yaml: string): unknown {
  const value: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    value[key] = key === "id" ? JSON.parse(raw) : raw;
  }
  return value;
}

function createConfiguration() {
  let id = 0;
  return createDefaultTrailPluginData({
    createId: () => `status-${id += 1}`,
    timezone: "UTC",
  }).configuration;
}

function environment(ids: string[], now: number) {
  return {
    createId: () => ids.shift() ?? "unexpected-id",
    now: () => now,
  };
}

class MemoryWorkflowPersistence implements TrailWorkflowPersistence {
  private readonly markdownByPath = new Map<string, string>();

  public async createProject(): Promise<TrailProjectParseResult> {
    throw new Error("Legacy Workflow createProject path must not be used");
  }

  public async createProjectAtPath(
    filePath: string,
    project: TrailProject,
  ): Promise<TrailProjectParseResult> {
    this.markdownByPath.set(filePath, serializeProjectMarkdown(project));
    return this.readSource(filePath);
  }

  public async listProjectSources() {
    return [...this.markdownByPath.keys()].sort().map((path) => ({
      kind: "file" as const,
      name: path.split("/").pop() ?? path,
      path,
    }));
  }

  public async appendIssue(
    filePath: string,
    expectedProject: TrailProject,
    issue: TrailWorkflowIssue,
  ) {
    const markdown = this.requireMarkdown(filePath);
    this.markdownByPath.set(filePath, appendWorkflowIssueToProjectMarkdown({
      expectedProject,
      filePath,
      issue,
      markdown,
      parseYaml,
    }));
    return this.readSource(filePath);
  }

  public async updateIssue(
    filePath: string,
    expectedIssue: TrailWorkflowIssue,
    issue: TrailWorkflowIssue,
  ) {
    const markdown = this.requireMarkdown(filePath);
    this.markdownByPath.set(filePath, updateWorkflowIssueInProjectMarkdown({
      expectedIssue,
      filePath,
      issue,
      markdown,
      parseYaml,
    }));
    return this.readSource(filePath);
  }

  public async readAll(): Promise<TrailWorkflowSnapshot> {
    return {
      projectResults: await Promise.all(
        [...this.markdownByPath.keys()].sort().map((path) => this.readSource(path)),
      ),
      structuralIssues: [],
    };
  }

  public async readSource(filePath: string): Promise<TrailProjectParseResult> {
    return parseProjectMarkdown({
      filePath,
      markdown: this.requireMarkdown(filePath),
      parseYaml,
    });
  }

  public externalTitleEdit(filePath: string, from: string, to: string): void {
    this.markdownByPath.set(
      filePath,
      this.requireMarkdown(filePath).replace(`## ${from}`, `## ${to}`),
    );
  }

  private requireMarkdown(filePath: string): string {
    const markdown = this.markdownByPath.get(filePath);
    if (markdown === undefined) throw new Error(`missing source: ${filePath}`);
    return markdown;
  }
}

describe("Workflow Entry planning", () => {
  it("creates Projects in the configured Unstarted default", () => {
    const configuration = createConfiguration();
    const command = normalizeCreateProjectCommand(
      "Trail Workflow",
      environment(["command-a", "project-a"], 100),
    );
    const result = planCreateProject(command, configuration, new Set());

    expect(result).toMatchObject({
      kind: "ready",
      plan: {
        kind: "create-project",
        project: {
          id: "project-a",
          statusDefinitionId: configuration.statuses.project.unstarted.defaultId,
          title: "Trail Workflow",
        },
      },
    });
  });

  it("creates Workflow Issues in Backlog with immutable creation time", () => {
    const configuration = createConfiguration();
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: configuration.statuses.project.unstarted.defaultId,
      title: "Trail Workflow",
    };
    const command = normalizeCreateWorkflowIssueCommand(
      project.id,
      "Implement status flow",
      environment(["command-a", "issue-a"], 250),
    );
    const result = planCreateWorkflowIssue(
      command,
      configuration,
      project,
      new Set([project.id]),
    );

    expect(result).toMatchObject({
      kind: "ready",
      plan: {
        issue: {
          context: "workflow",
          createdAt: 250,
          id: "issue-a",
          projectId: "project-a",
          statusDefinitionId: configuration.statuses.issue.backlog.defaultId,
        },
        kind: "create-workflow-issue",
      },
    });
  });

  it("maintains lifecycle timestamps and requires Estimate before Completed", () => {
    const configuration = createConfiguration();
    const backlog = configuration.statuses.issue.backlog.defaultId;
    const started = configuration.statuses.issue.started.defaultId;
    const completed = configuration.statuses.issue.completed.defaultId;
    const unstarted = configuration.statuses.issue.unstarted.defaultId;
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
        base,
        started,
        undefined,
        environment(["command-start"], 200),
      ),
      configuration,
      base,
    );
    expect(startedResult).toMatchObject({
      kind: "ready",
      plan: { issue: { firstStartedAt: 200, statusDefinitionId: started } },
    });
    if (startedResult.kind !== "ready" || startedResult.plan.kind !== "update-workflow-issue") {
      throw new Error("expected started plan");
    }

    const startedIssue = startedResult.plan.issue;
    const needsEstimate = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        startedIssue,
        completed,
        undefined,
        environment(["command-complete"], 300),
      ),
      configuration,
      startedIssue,
    );
    expect(needsEstimate).toEqual({ kind: "needs-input", requiredInput: "estimate" });

    const completedResult = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        startedIssue,
        completed,
        3,
        environment(["command-complete-2"], 300),
      ),
      configuration,
      startedIssue,
    );
    expect(completedResult).toMatchObject({
      kind: "ready",
      plan: {
        issue: {
          estimate: 3,
          firstStartedAt: 200,
          statusDefinitionId: completed,
          terminalAt: 300,
        },
      },
    });
    if (completedResult.kind !== "ready" || completedResult.plan.kind !== "update-workflow-issue") {
      throw new Error("expected completed plan");
    }

    const reopened = planChangeWorkflowIssueStatus(
      normalizeChangeWorkflowIssueStatusCommand(
        completedResult.plan.issue,
        unstarted,
        undefined,
        environment(["command-reopen"], 400),
      ),
      configuration,
      completedResult.plan.issue,
    );
    expect(reopened).toMatchObject({
      kind: "ready",
      plan: {
        issue: {
          firstStartedAt: 200,
          statusDefinitionId: unstarted,
          terminalAt: undefined,
        },
      },
    });
  });
});

describe("Workflow Entry service", () => {
  it("resolves an optimistic Project to its committed path when the queued Issue dequeues", async () => {
    const configuration = createConfiguration();
    const persistence = new MemoryWorkflowPersistence();
    const store = createTrailRuntimeStore();
    const ids = [
      "command-project", "project-a",
      "command-issue", "issue-a",
      "command-start",
    ];
    const service = new TrailWorkflowEntryService(
      store,
      new TrailMutationQueue(),
      persistence,
      configuration,
      { createId: () => ids.shift() ?? "unexpected", now: () => 100 },
    );
    await service.initialize();

    const projectReceipt = service.createProject("Trail Workflow");
    expect(selectEffectiveProjectById(store.getState(), projectReceipt.entityId)).toMatchObject({
      id: "project-a",
      title: "Trail Workflow",
    });

    const issueReceipt = service.createIssue("project-a", "Implement workflow");
    expect(selectEffectiveWorkflowIssueById(store.getState(), issueReceipt.entityId)).toMatchObject({
      id: "issue-a",
      statusDefinitionId: configuration.statuses.issue.backlog.defaultId,
    });

    await Promise.all([projectReceipt.completion, issueReceipt.completion]);

    const issue = store.getState().committed.workflowIssuesById["issue-a"];
    await service.changeIssueStatus(
      issue,
      configuration.statuses.issue.started.defaultId,
    ).completion;

    expect(store.getState().committed.workflowIssuesById["issue-a"]).toMatchObject({
      firstStartedAt: 100,
      statusDefinitionId: configuration.statuses.issue.started.defaultId,
    });
    expect(store.getState().committed.sourceByEntityId["project-a"]).toBe(
      "Trail/Projects/0001 Trail Workflow.md",
    );
    expect(store.getState().committed.sourceByEntityId["issue-a"]).toBe(
      "Trail/Projects/0001 Trail Workflow.md",
    );
  });

  it("keeps last-known-good state when an external Project edit becomes invalid", async () => {
    const configuration = createConfiguration();
    const persistence = new MemoryWorkflowPersistence();
    const store = createTrailRuntimeStore();
    const ids = ["command-project", "project-a", "command-issue", "issue-a"];
    const service = new TrailWorkflowEntryService(
      store,
      new TrailMutationQueue(),
      persistence,
      configuration,
      { createId: () => ids.shift() ?? "unexpected", now: () => 100 },
    );
    await service.initialize();
    await service.createProject("Trail Workflow").completion;
    await service.createIssue("project-a", "Keep me").completion;
    const path = store.getState().committed.sourceByEntityId["project-a"];

    persistence.externalTitleEdit(path, "Keep me", "");
    await service.refreshSource(path);

    expect(store.getState().committed.workflowIssuesById["issue-a"].title).toBe("Keep me");
    expect(store.getState().committed.sourceIssuesByPath[path]?.length).toBeGreaterThan(0);
  });
});
