import type {
  TrailProjectSourceResult,
  TrailTriageSourceResult,
} from "../../persistence/domain-sources/trail-source-result";
import type {
  TrailProjectSourceSnapshot,
} from "../../persistence/domain-sources/trail-domain-source-snapshot";
import { describe, expect, it } from "vitest";

import {
  createDefaultTrailPluginData,
  resolveDefaultStatusDefinition,
} from "../../domain/trail-configuration";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import { TrailMutationQueue } from "../../mutation/queue/trail-mutation-queue";
import { TRAIL_TRIAGE_PATH } from "../../markdown/schema/trail-paths";
import type { TrailProject } from "../../domain/trail-project";
import {
  selectEffectiveTriageIssueById,
  selectEffectiveWorkflowIssueById,
} from "../../runtime/projection/trail-runtime-projection";
import {
  reconcileProjectContribution,
  reconcileTriageContribution,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  selectSourceIssuesForPath,
  setTrailRuntimeConfiguration,
} from "../../runtime/store/trail-runtime-store";
import {
  TrailTriageAcceptService,
  planAcceptTriageIssue,
  normalizeAcceptTriageCommand,
} from "./trail-triage-accept";
import type { TrailTriagePersistence } from "../../persistence/domain-sources/trail-triage-persistence";
import type { TrailWorkflowPersistence } from "../../persistence/domain-sources/trail-workflow-persistence";

const targetPath = "Trail/Projects/0001 Accept Target.md";

function createConfiguration() {
  let next = 0;
  return createDefaultTrailPluginData({
    createId: () => `config-${++next}`,
    timezone: "UTC",
  }).configuration;
}

function triageResult(issue?: TrailTriageIssue): TrailTriageSourceResult {
  return {
    contribution: {
      filePath: TRAIL_TRIAGE_PATH,
      issuesById: issue === undefined ? {} : { [issue.id]: issue },
    },
    issues: [],
  };
}

function projectResult(
  project: TrailProject,
  issues: readonly TrailWorkflowIssue[] = [],
): TrailProjectSourceResult {
  const issuesById: Record<string, TrailWorkflowIssue> = {};
  for (const issue of issues) issuesById[issue.id] = issue;
  return {
    contribution: {
      filePath: targetPath,
      issuesById,
      project,
    },
    issues: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function createFixture(options: {
  readonly appendGate?: ReturnType<typeof deferred<void>>;
  readonly failSourceDelete?: boolean;
  readonly failTargetDelete?: boolean;
} = {}) {
  const configuration = createConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: resolveDefaultStatusDefinition(
      configuration.statuses.project,
      "unstarted",
    ).id,
    title: "Accept Target",
  };
  const source: TrailTriageIssue = {
    context: "triage",
    description: "Carry this description",
    due: 9_999,
    estimate: 3,
    id: "triage-a",
    labelIds: ["label-a"],
    priority: "high",
    title: "Captured work",
  };
  let currentTriage = triageResult(source);
  let currentProject = projectResult(project);

  const triagePersistence: TrailTriagePersistence = {
    appendIssue: async () => {
      throw new Error("not used");
    },
    deleteIssue: async (expectedIssue) => {
      if (options.failSourceDelete) throw new Error("source delete failed");
      expect(currentTriage.contribution.issuesById[expectedIssue.id]).toEqual(expectedIssue);
      currentTriage = triageResult();
      return currentTriage;
    },
    readLatest: async () => currentTriage,
    updateIssue: async () => {
      throw new Error("not used");
    },
  };

  const workflowPersistence: TrailWorkflowPersistence = {
    appendIssue: async (_filePath, _expectedProject, issue) => {
      if (options.appendGate !== undefined) {
        await options.appendGate.promise;
      }
      currentProject = projectResult(project, [issue]);
      return currentProject;
    },
    createProjectAtPath: async () => {
      throw new Error("not used");
    },
    deleteIssue: async (_filePath, expectedIssue) => {
      if (options.failTargetDelete) throw new Error("target compensation failed");
      const current = currentProject.contribution?.issuesById[expectedIssue.id];
      if (current === undefined) throw new Error("target missing");
      currentProject = projectResult(project);
      return currentProject;
    },
    listProjectSources: async () => [],
    readAll: async () => ({
      projectResults: [currentProject],
      structuralIssues: [],
    }),
    readSource: async () => currentProject,
    updateIssue: async () => {
      throw new Error("not used");
    },
  };

  const runtimeStore = createTrailRuntimeStore();
  setTrailRuntimeConfiguration(runtimeStore, configuration);
  reconcileTriageContribution(runtimeStore, currentTriage.contribution);
  reconcileProjectContribution(
    runtimeStore,
    currentProject.contribution as TrailProjectSourceSnapshot,
  );
  const queue = new TrailMutationQueue();
  let idIndex = 0;
  const service = new TrailTriageAcceptService(
    runtimeStore,
    queue,
    triagePersistence,
    workflowPersistence,
    configuration,
    {
      createId: () => ["accept-command", "workflow-b"][idIndex++] ?? `extra-${idIndex}`,
      now: () => 2_000,
    },
  );

  return {
    configuration,
    currentProject: () => currentProject,
    project,
    runtimeStore,
    service,
    source,
  };
}

describe("Triage Accept planner", () => {
  it("creates a new Backlog identity and carries applicable enrichment but not Triage Due", () => {
    const fixture = createFixture();
    let idIndex = 0;
    const command = normalizeAcceptTriageCommand(
      fixture.source,
      fixture.project.id,
      {
        createId: () => ["command-a", "workflow-new"][idIndex++] ?? "extra",
        now: () => 4_000,
      },
    );
    const result = planAcceptTriageIssue(
      command,
      fixture.configuration,
      fixture.source,
      fixture.project,
      new Set([fixture.source.id, fixture.project.id]),
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.targetIssue).toMatchObject({
      context: "workflow",
      createdAt: 4_000,
      description: fixture.source.description,
      estimate: 3,
      id: "workflow-new",
      labelIds: ["label-a"],
      priority: "high",
      projectId: fixture.project.id,
      title: fixture.source.title,
    });
    expect(result.targetIssue.due).toBeUndefined();
    expect(result.targetIssue.id).not.toBe(fixture.source.id);
  });
});

describe("Triage Accept service", () => {
  it("publishes source removal and target creation atomically before persistence commits", async () => {
    const gate = deferred<void>();
    const fixture = createFixture({ appendGate: gate });

    const receipt = fixture.service.accept(fixture.source, fixture.project.id);
    const optimistic = fixture.runtimeStore.getState();
    expect(selectEffectiveTriageIssueById(optimistic, fixture.source.id)).toBeUndefined();
    expect(selectEffectiveWorkflowIssueById(optimistic, receipt.targetIssueId)).toMatchObject({
      title: fixture.source.title,
    });
    expect(optimistic.committed.authoritative.domain.issuesById[fixture.source.id]).toBe(fixture.source);
    expect(optimistic.committed.authoritative.domain.issuesById[receipt.targetIssueId]).toBeUndefined();

    gate.resolve();
    await receipt.completion;

    const committed = fixture.runtimeStore.getState();
    expect(committed.committed.authoritative.domain.issuesById[fixture.source.id]).toBeUndefined();
    expect(committed.committed.authoritative.domain.issuesById[receipt.targetIssueId]).toMatchObject({
      title: fixture.source.title,
    });
    expect(committed.pending).toHaveLength(0);
  });

  it("compensates the new Workflow target when deleting the Triage source fails", async () => {
    const fixture = createFixture({ failSourceDelete: true });
    const receipt = fixture.service.accept(fixture.source, fixture.project.id);

    await expect(receipt.completion).rejects.toMatchObject({ code: "compensated" });

    const state = fixture.runtimeStore.getState();
    expect(state.committed.authoritative.domain.issuesById[fixture.source.id]).toEqual(fixture.source);
    expect(state.committed.authoritative.domain.issuesById[receipt.targetIssueId]).toBeUndefined();
    expect(state.pending).toHaveLength(0);
  });

  it("surfaces an explicit partial state when source deletion and target compensation both fail", async () => {
    const fixture = createFixture({
      failSourceDelete: true,
      failTargetDelete: true,
    });
    const receipt = fixture.service.accept(fixture.source, fixture.project.id);

    await expect(receipt.completion).rejects.toMatchObject({ code: "partial" });

    const state = fixture.runtimeStore.getState();
    expect(state.committed.authoritative.domain.issuesById[fixture.source.id]).toEqual(fixture.source);
    expect(state.committed.authoritative.domain.issuesById[receipt.targetIssueId]).toBeDefined();
    expect(selectSourceIssuesForPath(state, TRAIL_TRIAGE_PATH)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "triage-accept.partial" })]),
    );
    expect(selectSourceIssuesForPath(state, targetPath)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "triage-accept.partial" })]),
    );
    expect(state.pending).toHaveLength(0);
  });
});
