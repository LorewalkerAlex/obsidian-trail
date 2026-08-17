import type { TrailMilestone } from "../../domain/model/trail-entities";
import { planDeleteTrailMilestone } from "../../domain/planning/trail-delete-planning";
import { planCreateTrailMilestone } from "../../domain/planning/trail-milestone-planning";
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
  normalizeTrailCommandTimestamp,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

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
