import type { TrailProject } from "../../domain/model/trail-entities";
import type { TrailPriority } from "../../domain/model/trail-values";
import { planDeleteTrailProject } from "../../domain/planning/trail-delete-planning";
import {
  planChangeTrailProjectInitiative,
  planChangeTrailProjectStatus,
  planCreateTrailProject,
  planEditTrailProjectProperties,
} from "../../domain/planning/trail-project-planning";
import { sameTrailDomainEntity } from "../../domain/rules/trail-domain-equality";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../../source-sync/trail-authoritative-source-sync";
import {
  readTrailPlanningState,
  resolveTrailApplicationPlan,
  submitTrailApplicationPlan,
  type TrailEntityMutationReceipt,
  type TrailMutationActionResult,
} from "../trail-application-support";
import {
  normalizeTrailCommandDescription,
  normalizeTrailCommandId,
  normalizeTrailCommandIdSet,
  normalizeTrailCommandPriority,
  normalizeTrailCommandTime,
  normalizeTrailCommandTimestamp,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface TrailProjectPropertiesInput {
  readonly description?: string;
  readonly due?: number;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly title: string;
}

export class TrailProjectApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public create(title: string): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    // Every semantic command freezes a valid clock value before planning, even when unused by this effect.
    normalizeTrailCommandTime(this.environment);
    const result = planCreateTrailProject(state, {
      commandId,
      projectId: normalizeTrailCommandId(this.environment.createId(), "Project ID"),
      title: normalizeTrailCommandTitle(title, "Project"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Project creation unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.project.id,
    );
  }

  public editProperties(
    expectedProject: TrailProject,
    input: TrailProjectPropertiesInput,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailProjectProperties(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined ? undefined : normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedProject,
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      title: normalizeTrailCommandTitle(input.title, "Project"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "project", value: expectedProject },
      { kind: "project", value: planned.value.project },
    )) {
      return { entityId: expectedProject.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.project.id,
      ),
    };
  }

  public changeStatus(
    expectedProject: TrailProject,
    targetStatusDefinitionId: string,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailProjectStatus(state, {
      commandId,
      expectedProject,
      targetStatusDefinitionId: normalizeTrailCommandId(
        targetStatusDefinitionId,
        "StatusDefinition ID",
      ),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "project", value: expectedProject },
      { kind: "project", value: planned.value.project },
    )) {
      return { entityId: expectedProject.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.project.id,
      ),
    };
  }

  public changeInitiative(
    expectedProject: TrailProject,
    targetInitiativeId?: string,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailProjectInitiative(state, {
      commandId,
      expectedProject,
      targetInitiativeId: targetInitiativeId === undefined
        ? undefined
        : normalizeTrailCommandId(targetInitiativeId, "Initiative ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "project", value: expectedProject },
      { kind: "project", value: planned.value.project },
    )) {
      return { entityId: expectedProject.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.project.id,
      ),
    };
  }

  public delete(
    expectedProject: TrailProject,
    replacementProjectId?: string,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailProject(state, {
      commandId,
      expectedProject,
      replacementProjectId: replacementProjectId === undefined
        ? undefined
        : normalizeTrailCommandId(replacementProjectId, "Replacement Project ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(this.sourceSync, planned.value.plan, expectedProject.id),
    };
  }
}
