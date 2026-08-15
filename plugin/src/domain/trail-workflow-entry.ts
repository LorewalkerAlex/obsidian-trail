import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../diagnostics/trail-diagnostics";
import { submitTrailMutation } from "../mutation/coordinator/trail-mutation-coordinator";
import {
  executeTrailSingleTransaction,
  type TrailProjectCreateAtPathPersistence,
} from "../mutation/execution/trail-single-transaction-executor";
import {
  createTrailProjectPathAllocator,
  type TrailProjectSourceLister,
} from "../mutation/physical/trail-file-backed-entity-path-allocator";
import { materializeTrailSingleTransactionPlan } from "../mutation/physical/trail-single-transaction-plan";
import {
  resolveDefaultStatusDefinition,
  resolveStatusDefinition,
  type TrailConfiguration,
} from "./trail-configuration";
import {
  isTrailEpochMilliseconds,
  isTrailEstimateCarrier,
  isValidTrailTitle,
  normalizeTrailTitle,
  sameTrailWorkflowIssue,
  type TrailWorkflowIssue,
} from "./trail-issue";
import { TrailMutationQueue } from "./trail-mutation-queue";
import {
  TRAIL_PROJECTS_PATH,
  TRAIL_PROJECTS_PREFIX,
} from "./trail-physical-schema";
import { sameTrailProject, type TrailProject } from "./trail-project";
import {
  ProjectMarkdownMutationError,
  type TrailProjectContribution,
  type TrailProjectParseResult,
} from "./trail-project-markdown";
import {
  reconcileProjectContribution,
  removeProjectContribution,
  selectEffectiveEntityIdSet,
  selectEffectiveProjectById,
  selectEffectiveWorkflowIssueById,
  selectSourceIssuesForPath,
  setSourceIssuesForPath,
  type TrailRuntimeStore,
} from "./trail-runtime";
import type { TrailSourceIssue } from "./trail-source-issue";
import type { TrailWorkflowPersistence } from "./trail-workflow-persistence";
import {
  toTrailMutationPlan,
  type WorkflowMutationPlan,
} from "./trail-workflow-plan";
import { validateProjectContribution } from "./trail-workflow-validation";

export type WorkflowEntryActionKind =
  | "workflow.issue.create"
  | "workflow.issue.status"
  | "workflow.project.create";

export interface WorkflowEntryReceipt {
  readonly completion: Promise<void>;
  readonly entityId: string;
}

export interface WorkflowCommandEnvironment {
  readonly createId: () => string;
  readonly now: () => number;
}

export type WorkflowEntryErrorCode =
  | "conflict"
  | "needs-input"
  | "persistence-failed"
  | "planning-rejected"
  | "source-invalid"
  | "verification-failed";

export class WorkflowEntryError extends Error {
  public constructor(
    readonly code: WorkflowEntryErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "WorkflowEntryError";
  }
}

export class WorkflowNeedsInputError extends WorkflowEntryError {
  public constructor(
    readonly requiredInput: "estimate",
    message: string,
  ) {
    super("needs-input", message);
    this.name = "WorkflowNeedsInputError";
  }
}

interface CreateProjectCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly kind: "workflow.project.create";
  readonly projectId: string;
  readonly title: string;
}

interface CreateWorkflowIssueCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly issueId: string;
  readonly kind: "workflow.issue.create";
  readonly projectId: string;
  readonly title: string;
}

interface ChangeWorkflowIssueStatusCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly estimate?: number;
  readonly expectedIssue: TrailWorkflowIssue;
  readonly issueId: string;
  readonly kind: "workflow.issue.status";
  readonly targetStatusDefinitionId: string;
}

interface WorkflowPhysicalPersistence
  extends TrailProjectCreateAtPathPersistence<TrailProjectParseResult> {
  readonly listProjectSources: TrailProjectSourceLister;
}

export type WorkflowPlanResult =
  | { readonly kind: "needs-input"; readonly requiredInput: "estimate" }
  | { readonly kind: "ready"; readonly plan: WorkflowMutationPlan }
  | { readonly kind: "rejected"; readonly reason: string }
  | { readonly entityId: string; readonly kind: "unchanged" };

function errorCategory(error: unknown): string {
  if (error instanceof WorkflowEntryError) return error.code;
  if (error instanceof ProjectMarkdownMutationError) return error.code;
  if (error instanceof Error) return error.name;
  return "unknown-error";
}

function normalizeEffectiveAt(environment: WorkflowCommandEnvironment): number {
  const effectiveAt = environment.now();
  if (!isTrailEpochMilliseconds(effectiveAt)) {
    throw new WorkflowEntryError(
      "planning-rejected",
      "Workflow command effective timestamp is invalid",
    );
  }
  return effectiveAt;
}

function normalizeTitle(title: string, entityType: "Project" | "Workflow Issue"): string {
  const normalized = normalizeTrailTitle(title);
  if (!isValidTrailTitle(normalized)) {
    throw new WorkflowEntryError(
      "planning-rejected",
      `${entityType} title must be non-empty single-line text`,
    );
  }
  return normalized;
}

function normalizeId(id: string, label: string): string {
  const normalized = id.trim();
  if (normalized === "") {
    throw new WorkflowEntryError(
      "planning-rejected",
      `${label} must be non-empty text`,
    );
  }
  return normalized;
}

function requireWorkflowPhysicalPersistence(
  persistence: TrailWorkflowPersistence,
): TrailWorkflowPersistence & WorkflowPhysicalPersistence {
  const candidate = persistence as TrailWorkflowPersistence
    & Partial<WorkflowPhysicalPersistence>;
  if (
    typeof candidate.createProjectAtPath !== "function"
    || typeof candidate.listProjectSources !== "function"
  ) {
    throw new WorkflowEntryError(
      "persistence-failed",
      "Workflow persistence is missing single-transaction physical capabilities",
    );
  }
  return candidate as TrailWorkflowPersistence & WorkflowPhysicalPersistence;
}

export function normalizeCreateProjectCommand(
  title: string,
  environment: WorkflowCommandEnvironment,
): CreateProjectCommand {
  return {
    commandId: normalizeId(environment.createId(), "Command ID"),
    effectiveAt: normalizeEffectiveAt(environment),
    kind: "workflow.project.create",
    projectId: normalizeId(environment.createId(), "Project ID"),
    title: normalizeTitle(title, "Project"),
  };
}

export function normalizeCreateWorkflowIssueCommand(
  projectId: string,
  title: string,
  environment: WorkflowCommandEnvironment,
): CreateWorkflowIssueCommand {
  return {
    commandId: normalizeId(environment.createId(), "Command ID"),
    effectiveAt: normalizeEffectiveAt(environment),
    issueId: normalizeId(environment.createId(), "Workflow Issue ID"),
    kind: "workflow.issue.create",
    projectId: normalizeId(projectId, "Project ID"),
    title: normalizeTitle(title, "Workflow Issue"),
  };
}

export function normalizeChangeWorkflowIssueStatusCommand(
  expectedIssue: TrailWorkflowIssue,
  targetStatusDefinitionId: string,
  estimate: number | undefined,
  environment: WorkflowCommandEnvironment,
): ChangeWorkflowIssueStatusCommand {
  if (estimate !== undefined && !isTrailEstimateCarrier(estimate)) {
    throw new WorkflowEntryError(
      "planning-rejected",
      "Estimate must be a non-negative integer",
    );
  }
  return {
    commandId: normalizeId(environment.createId(), "Command ID"),
    effectiveAt: normalizeEffectiveAt(environment),
    estimate,
    expectedIssue,
    issueId: normalizeId(expectedIssue.id, "Workflow Issue ID"),
    kind: "workflow.issue.status",
    targetStatusDefinitionId: normalizeId(
      targetStatusDefinitionId,
      "Target StatusDefinition ID",
    ),
  };
}

export function planCreateProject(
  command: CreateProjectCommand,
  configuration: TrailConfiguration,
  existingEntityIds: ReadonlySet<string>,
): WorkflowPlanResult {
  if (existingEntityIds.has(command.projectId)) {
    return {
      kind: "rejected",
      reason: `Trail entity ID already exists: ${command.projectId}`,
    };
  }
  const status = resolveDefaultStatusDefinition(
    configuration.statuses.project,
    "unstarted",
  );
  const project: TrailProject = {
    id: command.projectId,
    labelIds: [],
    statusDefinitionId: status.id,
    title: command.title,
  };
  return {
    kind: "ready",
    plan: {
      commandId: command.commandId,
      kind: "create-project",
      project,
    },
  };
}

export function planCreateWorkflowIssue(
  command: CreateWorkflowIssueCommand,
  configuration: TrailConfiguration,
  currentProject: TrailProject | undefined,
  existingEntityIds: ReadonlySet<string>,
): WorkflowPlanResult {
  if (currentProject === undefined) {
    return {
      kind: "rejected",
      reason: `Project does not exist: ${command.projectId}`,
    };
  }
  if (existingEntityIds.has(command.issueId)) {
    return {
      kind: "rejected",
      reason: `Trail entity ID already exists: ${command.issueId}`,
    };
  }
  const projectStatus = resolveStatusDefinition(
    configuration.statuses.project,
    currentProject.statusDefinitionId,
  );
  if (projectStatus === undefined) {
    return {
      kind: "rejected",
      reason: `Project status is invalid: ${currentProject.id}`,
    };
  }
  if (projectStatus.category === "completed" || projectStatus.category === "canceled") {
    return {
      kind: "rejected",
      reason: "A terminal Project must be reopened before adding non-terminal work",
    };
  }

  const status = resolveDefaultStatusDefinition(
    configuration.statuses.issue,
    "backlog",
  );
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: command.effectiveAt,
    id: command.issueId,
    labelIds: [],
    projectId: currentProject.id,
    statusDefinitionId: status.id,
    title: command.title,
  };
  return {
    kind: "ready",
    plan: {
      commandId: command.commandId,
      expectedProject: currentProject,
      issue,
      kind: "create-workflow-issue",
    },
  };
}

function targetTerminalAt(
  currentIssue: TrailWorkflowIssue,
  currentCategory: string,
  targetCategory: string,
  effectiveAt: number,
): number | undefined {
  const targetTerminal = targetCategory === "completed" || targetCategory === "canceled";
  if (!targetTerminal) return undefined;
  if (currentCategory === targetCategory && currentIssue.terminalAt !== undefined) {
    return currentIssue.terminalAt;
  }
  return effectiveAt;
}

export function planChangeWorkflowIssueStatus(
  command: ChangeWorkflowIssueStatusCommand,
  configuration: TrailConfiguration,
  currentIssue: TrailWorkflowIssue | undefined,
): WorkflowPlanResult {
  if (currentIssue === undefined) {
    return {
      kind: "rejected",
      reason: `Workflow Issue does not exist: ${command.issueId}`,
    };
  }
  if (!sameTrailWorkflowIssue(currentIssue, command.expectedIssue)) {
    return {
      kind: "rejected",
      reason: `Workflow Issue changed before action: ${command.issueId}`,
    };
  }

  const currentStatus = resolveStatusDefinition(
    configuration.statuses.issue,
    currentIssue.statusDefinitionId,
  );
  const targetStatus = resolveStatusDefinition(
    configuration.statuses.issue,
    command.targetStatusDefinitionId,
  );
  if (currentStatus === undefined || targetStatus === undefined) {
    return {
      kind: "rejected",
      reason: "Workflow Issue status reference is invalid",
    };
  }

  if (command.estimate !== undefined && targetStatus.category !== "completed") {
    return {
      kind: "rejected",
      reason: "Estimate input may only accompany a Completed status change",
    };
  }

  const estimate = command.estimate ?? currentIssue.estimate;
  if (targetStatus.category === "completed" && estimate === undefined) {
    return { kind: "needs-input", requiredInput: "estimate" };
  }

  const firstStartedAt = currentIssue.firstStartedAt === undefined
    && targetStatus.category === "started"
    && currentStatus.category !== "started"
      ? command.effectiveAt
      : currentIssue.firstStartedAt;
  const terminalAt = targetTerminalAt(
    currentIssue,
    currentStatus.category,
    targetStatus.category,
    command.effectiveAt,
  );
  const issue: TrailWorkflowIssue = {
    ...currentIssue,
    estimate,
    firstStartedAt,
    statusDefinitionId: targetStatus.id,
    terminalAt,
  };

  if (sameTrailWorkflowIssue(issue, currentIssue)) {
    return { entityId: issue.id, kind: "unchanged" };
  }
  return {
    kind: "ready",
    plan: {
      commandId: command.commandId,
      expectedIssue: command.expectedIssue,
      issue,
      kind: "update-workflow-issue",
    },
  };
}

function validationIssueCodes(issues: readonly TrailSourceIssue[]): readonly string[] {
  return issues.map((issue) => issue.code);
}

/**
 * Orchestrates the first Formal Workflow vertical slice through the shared
 * optimistic overlay, global queue, dequeue-time physical planning, and
 * authoritative reread/reconciliation.
 */
export class TrailWorkflowEntryService {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly mutationQueue: TrailMutationQueue,
    private readonly persistence: TrailWorkflowPersistence,
    private readonly configuration: TrailConfiguration,
    private readonly commandEnvironment: WorkflowCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public async initialize(correlationId?: string): Promise<void> {
    this.diagnostics.record("workflow.initialize.started", { correlationId });
    const snapshot = await this.persistence.readAll();
    this.applySnapshot(snapshot, "initialize", correlationId, false);
    this.diagnostics.record("workflow.initialize.completed", {
      correlationId,
      data: {
        projectCount: this.runtimeStore.getState().committed.projectIds.length,
        sourceIssueCount: this.runtimeStore.getState().committed.sourceIssues.length,
        workflowIssueCount: Object.keys(
          this.runtimeStore.getState().committed.workflowIssuesById,
        ).length,
      },
    });
  }

  public async refreshAll(correlationId?: string): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      const snapshot = await this.persistence.readAll();
      this.applySnapshot(snapshot, "external-rescan", correlationId, true);
    }, {
      correlationId,
      kind: "workflow.refresh-all",
    });
  }

  public createProject(title: string): WorkflowEntryReceipt {
    const command = normalizeCreateProjectCommand(title, this.commandEnvironment);
    const result = planCreateProject(
      command,
      this.configuration,
      selectEffectiveEntityIdSet(this.runtimeStore.getState()),
    );
    return this.execute(command, result);
  }

  public createIssue(projectId: string, title: string): WorkflowEntryReceipt {
    const command = normalizeCreateWorkflowIssueCommand(
      projectId,
      title,
      this.commandEnvironment,
    );
    const state = this.runtimeStore.getState();
    const result = planCreateWorkflowIssue(
      command,
      this.configuration,
      selectEffectiveProjectById(state, projectId),
      selectEffectiveEntityIdSet(state),
    );
    return this.execute(command, result);
  }

  public changeIssueStatus(
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: number,
  ): WorkflowEntryReceipt {
    const command = normalizeChangeWorkflowIssueStatusCommand(
      expectedIssue,
      targetStatusDefinitionId,
      estimate,
      this.commandEnvironment,
    );
    const result = planChangeWorkflowIssueStatus(
      command,
      this.configuration,
      selectEffectiveWorkflowIssueById(this.runtimeStore.getState(), expectedIssue.id),
    );
    return this.execute(command, result);
  }

  public async refreshSource(
    filePath: string,
    correlationId?: string,
  ): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      const result = await this.persistence.readSource(filePath);
      this.consumeReadResult(result, "external-refresh", correlationId);
    }, {
      correlationId,
      kind: "workflow.refresh-source",
    });
  }

  public async removeSource(
    filePath: string,
    correlationId?: string,
  ): Promise<void> {
    await this.mutationQueue.enqueue(async () => {
      removeProjectContribution(this.runtimeStore, filePath);
      this.diagnostics.record("runtime.workflow.source-removed", {
        correlationId,
        data: { filePath },
        level: "warn",
      });
    }, {
      correlationId,
      kind: "workflow.remove-source",
    });
  }

  private applySnapshot(
    snapshot: Awaited<ReturnType<TrailWorkflowPersistence["readAll"]>>,
    reason: string,
    correlationId: string | undefined,
    removeMissingSources: boolean,
  ): void {
    const resultPaths = new Set<string>();
    for (const result of snapshot.projectResults) {
      const path = result.contribution?.filePath ?? result.issues[0]?.filePath;
      if (path !== undefined) resultPaths.add(path);
    }

    if (removeMissingSources) {
      const committed = this.runtimeStore.getState().committed;
      for (const path of Object.keys(committed.sourceEntityIdsByPath)) {
        if (path.startsWith(TRAIL_PROJECTS_PREFIX) && !resultPaths.has(path)) {
          removeProjectContribution(this.runtimeStore, path);
        }
      }
      for (const path of Object.keys(committed.sourceIssuesByPath)) {
        if (path === TRAIL_PROJECTS_PATH || path.startsWith(TRAIL_PROJECTS_PREFIX)) {
          setSourceIssuesForPath(this.runtimeStore, path, []);
        }
      }
    }

    for (const result of snapshot.projectResults) {
      this.consumeReadResult(result, reason, correlationId);
    }

    const structuralByPath = new Map<string, TrailSourceIssue[]>();
    for (const issue of snapshot.structuralIssues) {
      const current = structuralByPath.get(issue.filePath) ?? [];
      current.push(issue);
      structuralByPath.set(issue.filePath, current);
    }
    for (const [path, structuralIssues] of structuralByPath) {
      const existing = selectSourceIssuesForPath(this.runtimeStore.getState(), path);
      setSourceIssuesForPath(
        this.runtimeStore,
        path,
        [...existing, ...structuralIssues],
      );
    }
  }

  private execute(
    command:
      | CreateProjectCommand
      | CreateWorkflowIssueCommand
      | ChangeWorkflowIssueStatusCommand,
    result: WorkflowPlanResult,
  ): WorkflowEntryReceipt {
    const correlationId = command.commandId;
    this.diagnostics.record("command.created", {
      correlationId,
      data: {
        effectiveAt: command.effectiveAt,
        entityId: command.kind === "workflow.project.create"
          ? command.projectId
          : command.issueId,
        kind: command.kind,
        titleLength: "title" in command ? command.title.length : null,
      },
    });

    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new WorkflowEntryError("planning-rejected", result.reason);
    }
    if (result.kind === "needs-input") {
      this.diagnostics.record("command.needs-input", {
        correlationId,
        data: { kind: command.kind, requiredInput: result.requiredInput },
      });
      throw new WorkflowNeedsInputError(
        result.requiredInput,
        "Estimate is required before completing this Workflow Issue",
      );
    }
    if (result.kind === "unchanged") {
      this.diagnostics.record("command.noop", {
        correlationId,
        data: { entityId: result.entityId, kind: command.kind },
      });
      return { completion: Promise.resolve(), entityId: result.entityId };
    }

    const { plan } = result;
    const entityId = plan.kind === "create-project" ? plan.project.id : plan.issue.id;
    const logicalPlan = toTrailMutationPlan(plan);
    this.diagnostics.record("command.planned", {
      correlationId,
      data: { entityId, kind: command.kind, planKind: plan.kind },
    });

    // Coordinator owns the shared optimistic/pending lifecycle. Workflow keeps
    // only its semantic persistence verification, reconciliation, and recovery.
    let affectedPath: string | undefined;
    const completion = submitTrailMutation(
      this.runtimeStore,
      this.mutationQueue,
      {
        execute: async () => {
          const persisted = await this.persistPlan(plan, correlationId);
          affectedPath = persisted.contribution?.filePath;
          return persisted;
        },
        mapError: (error) => this.mapMutationError(error),
        onCommitted: () => {
          this.diagnostics.record("command.committed", {
            correlationId,
            data: { entityId, kind: command.kind },
          });
        },
        onFailed: (error) => {
          this.diagnostics.record("command.failed", {
            correlationId,
            data: { category: errorCategory(error), entityId, kind: command.kind },
            level: "error",
          });
        },
        optimisticData: { entityId },
        plan: logicalPlan,
        queueKind: command.kind,
        recover: async () => {
          await this.reconcileAfterFailure(affectedPath, correlationId);
        },
        settle: (persisted) => {
          const contribution = this.verifyPersistedResult(
            plan,
            persisted,
            correlationId,
            command.kind,
          );
          affectedPath = contribution.filePath;
          this.reconcileContribution(contribution, command.kind, correlationId);
        },
      },
      this.diagnostics,
    );

    return { completion, entityId };
  }

  private async persistPlan(
    plan: WorkflowMutationPlan,
    correlationId: string,
  ): Promise<TrailProjectParseResult> {
    const logicalPlan = toTrailMutationPlan(plan);
    const physicalPersistence = requireWorkflowPhysicalPersistence(this.persistence);
    const allocateProjectPath = createTrailProjectPathAllocator(
      () => physicalPersistence.listProjectSources(),
    );
    const physicalPlan = await materializeTrailSingleTransactionPlan(
      logicalPlan,
      this.runtimeStore.getState().committed,
      { allocateProjectPath },
    );

    if (
      plan.kind !== "create-project"
      && selectSourceIssuesForPath(
        this.runtimeStore.getState(),
        physicalPlan.sourcePath,
      ).length > 0
    ) {
      throw new WorkflowEntryError(
        "source-invalid",
        "Project source is invalid; review the Markdown before retrying",
      );
    }

    this.diagnostics.record("workflow.persistence.write.started", {
      correlationId,
      data: {
        filePath: physicalPlan.sourcePath,
        kind: plan.kind,
        projectId: plan.kind === "create-project"
          ? plan.project.id
          : plan.issue.projectId ?? null,
        issueId: plan.kind === "create-project" ? null : plan.issue.id,
      },
    });

    const executed = await executeTrailSingleTransaction(
      physicalPlan,
      {
        projectCreate: physicalPersistence,
        workflow: physicalPersistence,
      },
      correlationId,
    );
    if (executed.kind !== "project-source") {
      throw new WorkflowEntryError(
        "verification-failed",
        "Workflow single transaction returned a non-Project source result",
      );
    }
    return executed.result;
  }

  private verifyPersistedResult(
    plan: WorkflowMutationPlan,
    persisted: TrailProjectParseResult,
    correlationId: string,
    kind: WorkflowEntryActionKind,
  ): TrailProjectContribution {
    const filePath = persisted.contribution?.filePath ?? persisted.issues[0]?.filePath;
    if (persisted.issues.length > 0 || persisted.contribution === undefined) {
      if (filePath !== undefined) {
        setSourceIssuesForPath(this.runtimeStore, filePath, persisted.issues);
      }
      this.diagnostics.record("workflow.validation.failed", {
        correlationId,
        data: {
          issueCodes: validationIssueCodes(persisted.issues),
          kind,
          reason: "physical-post-write",
        },
        level: "error",
      });
      throw new WorkflowEntryError(
        "verification-failed",
        "Persisted Workflow source failed physical validation",
      );
    }

    const domainIssues = validateProjectContribution(
      persisted.contribution,
      this.configuration,
    );
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(
        this.runtimeStore,
        persisted.contribution.filePath,
        domainIssues,
      );
      this.diagnostics.record("workflow.validation.failed", {
        correlationId,
        data: {
          issueCodes: validationIssueCodes(domainIssues),
          kind,
          reason: "domain-post-write",
        },
        level: "error",
      });
      throw new WorkflowEntryError(
        "verification-failed",
        "Persisted Workflow source failed Domain validation",
      );
    }

    let matchesPlan = false;
    if (plan.kind === "create-project") {
      matchesPlan = sameTrailProject(persisted.contribution.project, plan.project);
    } else {
      const persistedIssue = persisted.contribution.issuesById[plan.issue.id];
      matchesPlan = persistedIssue !== undefined
        && sameTrailWorkflowIssue(persistedIssue, plan.issue);
    }
    if (!matchesPlan) {
      throw new WorkflowEntryError(
        "verification-failed",
        "Persisted Workflow mutation did not match the planned result",
      );
    }

    this.diagnostics.record("workflow.validation.completed", {
      correlationId,
      data: { filePath: persisted.contribution.filePath, kind },
    });
    return persisted.contribution;
  }

  private consumeReadResult(
    result: TrailProjectParseResult,
    reason: string,
    correlationId?: string,
  ): void {
    const filePath = result.contribution?.filePath ?? result.issues[0]?.filePath;
    if (result.issues.length > 0 || result.contribution === undefined) {
      if (filePath !== undefined) {
        setSourceIssuesForPath(this.runtimeStore, filePath, result.issues);
      }
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: filePath ?? null,
          issueCodes: validationIssueCodes(result.issues),
          reason,
        },
        level: "warn",
      });
      return;
    }

    const domainIssues = validateProjectContribution(
      result.contribution,
      this.configuration,
    );
    if (domainIssues.length > 0) {
      setSourceIssuesForPath(
        this.runtimeStore,
        result.contribution.filePath,
        domainIssues,
      );
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: result.contribution.filePath,
          issueCodes: validationIssueCodes(domainIssues),
          reason,
        },
        level: "warn",
      });
      return;
    }

    try {
      this.reconcileContribution(result.contribution, reason, correlationId);
    } catch (error: unknown) {
      const issue: TrailSourceIssue = {
        code: "workflow.source.identity-conflict",
        filePath: result.contribution.filePath,
        message: error instanceof Error ? error.message : "Workflow identity conflict",
        scope: "file",
      };
      setSourceIssuesForPath(this.runtimeStore, result.contribution.filePath, [issue]);
      this.diagnostics.record("workflow.source.invalid", {
        correlationId,
        data: {
          filePath: result.contribution.filePath,
          issueCodes: [issue.code],
          reason,
        },
        level: "warn",
      });
    }
  }

  private reconcileContribution(
    contribution: TrailProjectContribution,
    reason: string,
    correlationId?: string,
  ): void {
    const result = reconcileProjectContribution(this.runtimeStore, contribution);
    this.diagnostics.record("runtime.workflow.reconciled", {
      correlationId,
      data: {
        addedIssueIds: result.diff.addedIssueIds,
        changedIssueFieldsById: result.diff.changedIssueFieldsById,
        changedIssueIds: result.diff.changedIssueIds,
        committedRevision: result.revision,
        issueCount: result.issueCount,
        projectChangedFields: result.diff.projectChangedFields,
        projectCount: result.projectCount,
        projectId: result.diff.projectId,
        projectWasAdded: result.diff.projectWasAdded,
        reason,
        removedIssueIds: result.diff.removedIssueIds,
      },
    });
  }

  private async reconcileAfterFailure(
    filePath: string | undefined,
    correlationId: string,
  ): Promise<void> {
    try {
      if (filePath !== undefined) {
        this.consumeReadResult(
          await this.persistence.readSource(filePath),
          "failure-reconcile",
          correlationId,
        );
        return;
      }
      const snapshot = await this.persistence.readAll();
      for (const issue of snapshot.structuralIssues) {
        setSourceIssuesForPath(this.runtimeStore, issue.filePath, [issue]);
      }
      for (const result of snapshot.projectResults) {
        this.consumeReadResult(result, "failure-reconcile", correlationId);
      }
    } catch (error: unknown) {
      this.diagnostics.record("workflow.failure-reconcile.failed", {
        correlationId,
        data: { category: errorCategory(error), filePath: filePath ?? null },
        level: "error",
      });
    }
  }

  private mapMutationError(error: unknown): WorkflowEntryError {
    if (error instanceof WorkflowEntryError) return error;
    if (error instanceof ProjectMarkdownMutationError) {
      if (error.code === "conflict" || error.code === "target-missing") {
        return new WorkflowEntryError(
          "conflict",
          "Workflow source changed outside Trail. Review the latest state and try again.",
          error,
        );
      }
      if (error.code === "source-invalid") {
        return new WorkflowEntryError(
          "source-invalid",
          "Project Markdown became invalid before the mutation could be saved",
          error,
        );
      }
      return new WorkflowEntryError(
        "verification-failed",
        "Workflow Markdown mutation failed verification",
        error,
      );
    }
    return new WorkflowEntryError(
      "persistence-failed",
      "Workflow change could not be persisted",
      error,
    );
  }
}
