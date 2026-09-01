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
import type { TrailWorkflowIssueCreateInput } from "../issues/trail-issue-application";
import type { TrailProjectCreateInput } from "../projects/trail-project-application";
import {
  readTrailPlanningState,
  resolveTrailApplicationPlan,
  submitTrailApplicationPlan,
  type TrailEntityMutationReceipt,
  type TrailMutationActionResult,
} from "../trail-application-support";
import {
  normalizeTrailCommandDescription,
  normalizeTrailCommandEstimate,
  normalizeTrailCommandId,
  normalizeTrailCommandIdSet,
  normalizeTrailCommandPriority,
  normalizeTrailCommandTime,
  normalizeTrailCommandTimestamp,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface TrailTriageCreateInput {
  readonly description?: string;
  readonly due?: number;
  readonly labelIds: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title: string;
}

export interface TrailTriagePropertiesInput {
  readonly description?: string;
  readonly due: number;
  readonly labelIds: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title: string;
}

export class TrailTriageApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  /** Standard Triage Composer submission. */
  public create(input: TrailTriageCreateInput): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    const effectiveAt = normalizeTrailCommandTime(this.environment);
    const due = input.due === undefined
      ? resolveTrailTriageDefaultDue(effectiveAt, state.configuration.temporal.timezone)
      : normalizeTrailCommandTimestamp(input.due, "Due");
    const result = planCreateTrailTriageIssue(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due,
      issueId: normalizeTrailCommandId(this.environment.createId(), "Triage Issue ID"),
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      title: normalizeTrailCommandTitle(input.title, "Triage Issue"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage creation unexpectedly requires input");
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, planned.value.issue.id);
  }

  /** Compatibility use case for title-only capture; product Quick Capture may seed the full Composer. */
  public capture(title: string): TrailEntityMutationReceipt {
    return this.create({ labelIds: [], title });
  }

  public edit(
    expectedIssue: TrailTriageIssue,
    input: TrailTriagePropertiesInput,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailTriageIssue(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedIssue,
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
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

  /** Accept as Issue submits the explicit standard Issue Composer draft. */
  public acceptFromDraft(
    expectedIssue: TrailTriageIssue,
    input: TrailWorkflowIssueCreateInput,
  ): TrailEntityMutationReceipt {
    const result = planAcceptTrailTriageIssue(readTrailPlanningState(this.runtimeStore), {
      commandId: normalizeTrailCommandId(this.environment.createId(), "Command ID"),
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined
        ? undefined
        : normalizeTrailCommandTimestamp(input.due, "Due"),
      effectiveAt: normalizeTrailCommandTime(this.environment),
      estimate: normalizeTrailCommandEstimate(input.estimate),
      expectedIssue,
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      milestoneId: input.milestoneId === undefined
        ? undefined
        : normalizeTrailCommandId(input.milestoneId, "Milestone ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      projectId: normalizeTrailCommandId(input.projectId, "Project ID"),
      targetIssueId: normalizeTrailCommandId(this.environment.createId(), "Workflow Issue ID"),
      title: normalizeTrailCommandTitle(input.title, "Workflow Issue"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") throw new Error("Triage Accept unexpectedly requires input");
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.targetIssue.id,
    );
  }

  /**
   * Compatibility semantic action. It honors the V1 automatic seed contract:
   * only source Title + Description enter the normal target draft.
   */
  public accept(expectedIssue: TrailTriageIssue, projectId: string): TrailEntityMutationReceipt {
    return this.acceptFromDraft(expectedIssue, {
      description: expectedIssue.description,
      labelIds: [],
      projectId,
      title: expectedIssue.title,
    });
  }

  /** Accept as Project submits the explicit standard Project Composer draft. */
  public convertToProjectFromDraft(
    expectedIssue: TrailTriageIssue,
    input: TrailProjectCreateInput,
  ): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planConvertTrailTriageIssueToProject(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined
        ? undefined
        : normalizeTrailCommandTimestamp(input.due, "Due"),
      expectedIssue,
      initiativeId: input.initiativeId === undefined
        ? undefined
        : normalizeTrailCommandId(input.initiativeId, "Initiative ID"),
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      targetProjectId: normalizeTrailCommandId(this.environment.createId(), "Project ID"),
      title: normalizeTrailCommandTitle(input.title, "Project"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Triage Accept as Project unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.targetProject.id,
    );
  }

  /** Compatibility Project target with only the V1 automatic Title + Description seed. */
  public convertToProject(expectedIssue: TrailTriageIssue): TrailEntityMutationReceipt {
    return this.convertToProjectFromDraft(expectedIssue, {
      description: expectedIssue.description,
      labelIds: [],
      title: expectedIssue.title,
    });
  }
}
