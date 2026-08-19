import type { TrailMilestone } from "../../domain/model/trail-entities";
import { planDeleteTrailMilestone } from "../../domain/planning/trail-delete-planning";
import {
  planCreateTrailMilestone,
  planEditTrailMilestoneProperties,
} from "../../domain/planning/trail-milestone-planning";
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
  normalizeTrailCommandTime,
  normalizeTrailCommandTimestamp,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface TrailMilestonePropertiesInput {
  readonly description?: string;
  readonly due?: number;
  readonly title: string;
}

export class TrailMilestoneApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public create(projectId: string, title: string, due?: number): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planCreateTrailMilestone(state, {
      commandId,
      due: due === undefined ? undefined : normalizeTrailCommandTimestamp(due, "Due"),
      milestoneId: normalizeTrailCommandId(this.environment.createId(), "Milestone ID"),
      projectId: normalizeTrailCommandId(projectId, "Project ID"),
      title: normalizeTrailCommandTitle(title, "Milestone"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Milestone creation unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.milestone.id,
    );
  }

  public editProperties(
    expectedMilestone: TrailMilestone,
    input: TrailMilestonePropertiesInput,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailMilestoneProperties(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined ? undefined : normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedMilestone,
      title: normalizeTrailCommandTitle(input.title, "Milestone"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "milestone", value: expectedMilestone },
      { kind: "milestone", value: planned.value.milestone },
    )) {
      return { entityId: expectedMilestone.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.milestone.id,
      ),
    };
  }

  public delete(
    expectedMilestone: TrailMilestone,
    replacementMilestoneId?: string,
  ): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailMilestone(state, {
      commandId,
      expectedMilestone,
      replacementMilestoneId: replacementMilestoneId === undefined
        ? undefined
        : normalizeTrailCommandId(replacementMilestoneId, "Replacement Milestone ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Milestone deletion unexpectedly requires input");
    }
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, expectedMilestone.id);
  }
}
