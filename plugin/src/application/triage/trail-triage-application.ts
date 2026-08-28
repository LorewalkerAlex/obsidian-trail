import type { TrailTriageIssue } from "../../domain/model/trail-entities";
import {
  planAcceptTrailTriageIssue,
  planConvertTrailTriageIssueToProject,
  planCreateTrailTriageIssue,
  planDeferTrailTriageIssue,
  planDeleteTrailTriageIssue,
  planEditTrailTriageIssue,
} from "../../domain/planning/trail-triage-planning";
import { sameTrailDomainEntity } from "../../domain/rules/trail-domain-equality";
import { resolveTrailTriageDefaultDue } from "../../domain/rules/trail-temporal-rules";
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
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

export class TrailTriageApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public capture(title: string): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const effectiveAt = normalizeTrailCommandTime(this.environment);
    const result = planCreateTrailTriageIssue(state, {
      commandId: normalizeTrailCommandId(this.environment.createId(), "Command ID"),
      due: resolveTrailTriageDefaultDue(
        effectiveAt,
        state.configuration.temporal.timezone,
      ),
      issueId: normalizeTrailCommandId(this.environment.createId(), "Triage Issue ID"),
      title: normalizeTrailCommandTitle(title, "Triage Issue"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage capture unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.issue.id);
  }

  public edit(
    expectedIssue: TrailTriageIssue,
    input: { readonly due: number; readonly title: string },
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailTriageIssue(state, {
      commandId,
      due: normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedIssue,
      title: normalizeTrailCommandTitle(input.title, "Triage Issue"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") return { input: planned.input, kind: "needs-input" };
    if (sameTrailDomainEntity(
      { kind: "issue", value: expectedIssue },
      { kind: "issue", value: planned.value.issue },
    )) {
      return { entityId: expectedIssue.id, kind: "unchanged" };
    }
    return {
      kind: "submitted",
      receipt: submitTrailApplicationPlan(
        this.sourceSync,
        planned.value.plan,
        planned.value.issue.id,
      ),
    };
  }

  public defer(expectedIssue: TrailTriageIssue, due: number): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeferTrailTriageIssue(state, {
      commandId,
      due: normalizeTrailCommandTimestamp(due, "Due"),
      expectedIssue,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage Defer unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.issue.id);
  }

  public delete(expectedIssue: TrailTriageIssue): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailTriageIssue(state, {
      commandId,
      expectedIssue,
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage Delete unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.issueId);
  }

  public accept(expectedIssue: TrailTriageIssue, projectId: string): TrailEntityMutationReceipt {
    const result = planAcceptTrailTriageIssue(readTrailPlanningState(this.runtimeStore), {
      commandId: normalizeTrailCommandId(this.environment.createId(), "Command ID"),
      effectiveAt: normalizeTrailCommandTime(this.environment),
      expectedIssue,
      projectId: normalizeTrailCommandId(projectId, "Project ID"),
      targetIssueId: normalizeTrailCommandId(this.environment.createId(), "Workflow Issue ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage Accept unexpectedly requires input");
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.targetIssue.id,
    );
  }

  public convertToProject(expectedIssue: TrailTriageIssue): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planConvertTrailTriageIssueToProject(state, {
      commandId,
      expectedIssue,
      targetProjectId: normalizeTrailCommandId(this.environment.createId(), "Project ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Triage Convert to Project unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.targetProject.id,
    );
  }
}
