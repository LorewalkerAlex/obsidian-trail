import { planSetTrailDefaultProject } from "../../domain/planning/trail-workspace-planning";
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

export class TrailWorkspaceApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public setDefaultProject(projectId: string): TrailMutationCommandResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const normalizedProjectId = normalizeTrailCommandId(projectId, "Project ID");
    if (state.workspaceState.defaultProjectId === normalizedProjectId) {
      return { kind: "unchanged" };
    }
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planSetTrailDefaultProject(state, {
      commandId,
      expectedWorkspaceState: state.workspaceState,
      projectId: normalizedProjectId,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    return {
      kind: "submitted",
      receipt: submitTrailApplicationMutationPlan(this.sourceSync, planned.value.plan),
    };
  }
}
