import type { TrailCycle } from "../../domain/model/trail-entities";
import {
  planChangeTrailCycleMembership,
  planCloseTrailCycle,
  planOpenTrailCycle,
} from "../../domain/planning/trail-cycle-planning";
import { planDeleteTrailCycle } from "../../domain/planning/trail-delete-planning";
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
  normalizeTrailCommandId,
  normalizeTrailCommandTime,
  normalizeTrailCommandTimestamp,
  type TrailCommandEnvironment,
} from "../trail-command";

function normalizeIssueIds(issueIds: readonly string[]): readonly string[] {
  return issueIds.map((issueId) => normalizeTrailCommandId(issueId, "Issue ID"));
}

export class TrailCycleApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public open(input: {
    readonly issueIds?: readonly string[];
    readonly plannedEnd: number;
  }): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    const startedAt = normalizeTrailCommandTime(this.environment);
    const result = planOpenTrailCycle(state, {
      commandId,
      cycleId: normalizeTrailCommandId(this.environment.createId(), "Cycle ID"),
      issueIds: normalizeIssueIds(input.issueIds ?? []),
      plannedEnd: normalizeTrailCommandTimestamp(input.plannedEnd, "Cycle planned end"),
      startedAt,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Cycle open unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.cycle.id);
  }

  public changeMembership(
    expectedCycle: TrailCycle,
    issueIds: readonly string[],
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailCycleMembership(state, {
      commandId,
      expectedCycle,
      issueIds: normalizeIssueIds(issueIds),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "cycle", value: expectedCycle },
      { kind: "cycle", value: planned.value.cycle },
    )) {
      return { entityId: expectedCycle.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.cycle.id),
    };
  }

  public close(expectedCycle: TrailCycle): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    const effectiveAt = normalizeTrailCommandTime(this.environment);
    const result = planCloseTrailCycle(state, { commandId, effectiveAt, expectedCycle });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Cycle close unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.cycle.id);
  }

  public delete(expectedCycle: TrailCycle): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailCycle(state, { commandId, expectedCycle });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Cycle deletion unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, expectedCycle.id);
  }
}
