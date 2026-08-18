import type { TrailInitiative } from "../../domain/model/trail-entities";
import type { TrailPriority } from "../../domain/model/trail-values";
import { planDeleteTrailInitiative } from "../../domain/planning/trail-delete-planning";
import {
  planCreateTrailInitiative,
  planEditTrailInitiativeProperties,
} from "../../domain/planning/trail-initiative-planning";
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

export interface TrailInitiativePropertiesInput {
  readonly description?: string;
  readonly due?: number;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly title: string;
}

export class TrailInitiativeApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public create(title: string): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planCreateTrailInitiative(state, {
      commandId,
      initiativeId: normalizeTrailCommandId(this.environment.createId(), "Initiative ID"),
      title: normalizeTrailCommandTitle(title, "Initiative"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Initiative creation unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.initiative.id,
    );
  }

  public editProperties(
    expectedInitiative: TrailInitiative,
    input: TrailInitiativePropertiesInput,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailInitiativeProperties(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined ? undefined : normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedInitiative,
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      title: normalizeTrailCommandTitle(input.title, "Initiative"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "initiative", value: expectedInitiative },
      { kind: "initiative", value: planned.value.initiative },
    )) {
      return { entityId: expectedInitiative.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.initiative.id,
      ),
    };
  }

  public delete(
    expectedInitiative: TrailInitiative,
    replacementInitiativeId?: string,
  ): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailInitiative(state, {
      commandId,
      expectedInitiative,
      replacementInitiativeId: replacementInitiativeId === undefined
        ? undefined
        : normalizeTrailCommandId(replacementInitiativeId, "Replacement Initiative ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Initiative deletion unexpectedly requires input");
    }
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, expectedInitiative.id);
  }
}
