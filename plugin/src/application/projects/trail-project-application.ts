import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "../../diagnostics/trail-diagnostics";
import {
  resolveDefaultStatusDefinition,
  type TrailConfiguration,
} from "../../domain/trail-configuration";
import type { TrailProject } from "../../domain/trail-project";
import {
  createTrailMutationPlan,
  projectMutationEntity,
  type TrailMutationPlan,
} from "../../mutation/plans/trail-mutation-plan";
import { selectEffectiveEntityIdSet } from "../../runtime/projection/trail-runtime-projection";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailProjectSourceSync } from "../../source-sync/projects/trail-project-source-sync";
import type { TrailEntityMutationReceipt } from "../trail-application-contracts";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  normalizeTrailCommandTitle,
  TrailCommandValidationError,
  type TrailCommandEnvironment,
} from "../trail-command";

interface CreateProjectCommand {
  readonly commandId: string;
  readonly effectiveAt: number;
  readonly kind: "workflow.project.create";
  readonly projectId: string;
  readonly title: string;
}

export type TrailProjectPlanResult =
  | {
      readonly kind: "ready";
      readonly plan: TrailMutationPlan;
      readonly project: TrailProject;
    }
  | { readonly kind: "rejected"; readonly reason: string };

export class TrailProjectApplicationError extends Error {
  public constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TrailProjectApplicationError";
  }
}

export function normalizeCreateProjectCommand(
  title: string,
  environment: TrailCommandEnvironment,
): CreateProjectCommand {
  try {
    return {
      commandId: normalizeTrailCommandId(environment.createId(), "Command ID"),
      effectiveAt: normalizeTrailCommandTime(environment),
      kind: "workflow.project.create",
      projectId: normalizeTrailCommandId(environment.createId(), "Project ID"),
      title: normalizeTrailCommandTitle(title, "Project"),
    };
  } catch (error: unknown) {
    if (error instanceof TrailCommandValidationError) {
      throw new TrailProjectApplicationError(error.message, error);
    }
    throw error;
  }
}

export function planCreateProject(
  command: CreateProjectCommand,
  configuration: TrailConfiguration,
  existingEntityIds: ReadonlySet<string>,
): TrailProjectPlanResult {
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
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: projectMutationEntity(project), kind: "create" }],
      intent: "workflow.project.create",
    }),
    project,
  };
}

/** User-facing Project creation use case; persistence/reconcile stays in Source Sync. */
export class TrailProjectApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailProjectSourceSync,
    private readonly configuration: TrailConfiguration,
    private readonly commandEnvironment: TrailCommandEnvironment,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {}

  public create(title: string): TrailEntityMutationReceipt {
    const command = normalizeCreateProjectCommand(title, this.commandEnvironment);
    this.diagnostics.record("command.created", {
      correlationId: command.commandId,
      data: {
        effectiveAt: command.effectiveAt,
        entityId: command.projectId,
        kind: command.kind,
        titleLength: command.title.length,
      },
    });
    const result = planCreateProject(
      command,
      this.configuration,
      selectEffectiveEntityIdSet(this.runtimeStore.getState()),
    );
    if (result.kind === "rejected") {
      this.diagnostics.record("command.rejected", {
        correlationId: command.commandId,
        data: { kind: command.kind, reason: "planning-rejected" },
        level: "warn",
      });
      throw new TrailProjectApplicationError(result.reason);
    }
    this.diagnostics.record("command.planned", {
      correlationId: command.commandId,
      data: { entityId: result.project.id, intent: result.plan.intent, kind: command.kind },
    });
    return this.sourceSync.submit({
      actionKind: command.kind,
      correlationId: command.commandId,
      entity: result.project,
      plan: result.plan,
    });
  }
}
