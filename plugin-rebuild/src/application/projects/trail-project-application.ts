import { planCreateTrailProject } from "../../domain/planning/trail-project-planning";
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
}
