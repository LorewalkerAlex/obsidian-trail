import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import { planChangeTrailConfiguration } from "../../domain/planning/trail-configuration-planning";
import { sameTrailConfiguration } from "../../domain/rules/trail-domain-equality";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../../source-sync/trail-authoritative-source-sync";
import {
  readTrailPlanningState,
  resolveTrailApplicationPlan,
  submitTrailApplicationMutationPlan,
  type TrailMutationCommandResult,
} from "../trail-application-support";
import {
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface ChangeTrailConfigurationInput {
  readonly expectedConfiguration: TrailConfiguration;
  readonly nextConfiguration: TrailConfiguration;
  readonly resolvedLabelIdsByEntityId?: Readonly<Record<string, readonly string[]>>;
  readonly resolvedStatusDefinitionIdsByEntityId?: Readonly<Record<string, string>>;
}

/** Thin Application boundary for validated Configuration replacement and reference repair. */
export class TrailConfigurationApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public change(input: ChangeTrailConfigurationInput): TrailMutationCommandResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailConfiguration(state, {
      commandId,
      expectedConfiguration: input.expectedConfiguration,
      nextConfiguration: input.nextConfiguration,
      resolvedLabelIdsByEntityId: input.resolvedLabelIdsByEntityId,
      resolvedStatusDefinitionIdsByEntityId: input.resolvedStatusDefinitionIdsByEntityId,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      return { input: planned.input, kind: "needs-input" };
    }
    if (
      planned.value.updatedEntities.length === 0
      && sameTrailConfiguration(input.expectedConfiguration, planned.value.configuration)
    ) {
      return { kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationMutationPlan(this.sourceSync, planned.value.plan),
    };
  }
}
