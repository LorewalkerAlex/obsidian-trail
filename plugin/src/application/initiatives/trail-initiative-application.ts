import type { TrailInitiative } from "../../domain/model/trail-entities";
import { planDeleteTrailInitiative } from "../../domain/planning/trail-delete-planning";
import { planCreateTrailInitiative } from "../../domain/planning/trail-initiative-planning";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../../source-sync/trail-authoritative-source-sync";
import {
  readTrailPlanningState,
  resolveTrailApplicationPlan,
  submitTrailApplicationPlan,
  type TrailEntityMutationReceipt,
} from "../trail-application-support";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

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
