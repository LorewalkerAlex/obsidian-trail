import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import type {
  TrailEstimate,
  TrailPriority,
} from "../../domain/model/trail-values";
import { planDeleteTrailWorkflowIssue } from "../../domain/planning/trail-delete-planning";
import {
  planChangeTrailWorkflowIssueMilestone,
  planChangeTrailWorkflowIssueStatus,
  planCreateTrailWorkflowIssue,
  planEditTrailWorkflowIssueProperties,
  planMoveTrailWorkflowIssueProject,
} from "../../domain/planning/trail-issue-planning";
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
  normalizeTrailCommandEstimate,
  normalizeTrailCommandId,
  normalizeTrailCommandIdSet,
  normalizeTrailCommandPriority,
  normalizeTrailCommandTime,
  normalizeTrailCommandTimestamp,
  normalizeTrailCommandTitle,
  type TrailCommandEnvironment,
} from "../trail-command";

export interface TrailWorkflowIssuePropertiesInput {
  readonly description?: string;
  readonly due?: number;
  readonly estimate?: TrailEstimate;
  readonly labelIds: readonly string[];
  readonly priority?: TrailPriority;
  readonly title: string;
}

export class TrailIssueApplication {
  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly sourceSync: TrailAuthoritativeSourceSync,
    private readonly environment: TrailCommandEnvironment,
  ) {}

  public create(projectId: string, title: string): TrailEntityMutationReceipt {
    const result = planCreateTrailWorkflowIssue(readTrailPlanningState(this.runtimeStore), {
      commandId: normalizeTrailCommandId(this.environment.createId(), "Command ID"),
      effectiveAt: normalizeTrailCommandTime(this.environment),
      issueId: normalizeTrailCommandId(this.environment.createId(), "Workflow Issue ID"),
      projectId: normalizeTrailCommandId(projectId, "Project ID"),
      title: normalizeTrailCommandTitle(title, "Workflow Issue"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Workflow Issue creation unexpectedly requires input");
    }
    return submitTrailApplicationPlan(
      this.sourceSync,
      planned.value.plan,
      planned.value.issue.id,
    );
  }

  public editProperties(
    expectedIssue: TrailWorkflowIssue,
    input: TrailWorkflowIssuePropertiesInput,
  ): TrailMutationActionResult {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planEditTrailWorkflowIssueProperties(state, {
      commandId,
      description: normalizeTrailCommandDescription(input.description),
      due: input.due === undefined
        ? undefined
        : normalizeTrailCommandTimestamp(input.due, "Due"),
      estimate: normalizeTrailCommandEstimate(input.estimate),
      expectedIssue,
      labelIds: normalizeTrailCommandIdSet(input.labelIds, "Label ID"),
      priority: normalizeTrailCommandPriority(input.priority),
      title: normalizeTrailCommandTitle(input.title, "Workflow Issue"),
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

  public changeStatus(
    expectedIssue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
    estimate?: TrailEstimate,
  ): TrailMutationActionResult {
    const result = planChangeTrailWorkflowIssueStatus(readTrailPlanningState(this.runtimeStore), {
      commandId: normalizeTrailCommandId(this.environment.createId(), "Command ID"),
      effectiveAt: normalizeTrailCommandTime(this.environment),
      estimate: normalizeTrailCommandEstimate(estimate),
      expectedIssue,
      targetStatusDefinitionId: normalizeTrailCommandId(
        targetStatusDefinitionId,
        "StatusDefinition ID",
      ),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      return { input: planned.input, kind: "needs-input" };
    }
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

  public moveToProject(
    expectedIssue: TrailWorkflowIssue,
    targetProjectId: string,
  ): TrailMutationActionResult {
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planMoveTrailWorkflowIssueProject(readTrailPlanningState(this.runtimeStore), {
      commandId,
      expectedIssue,
      targetProjectId: normalizeTrailCommandId(targetProjectId, "Project ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      return { input: planned.input, kind: "needs-input" };
    }
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

  public changeMilestone(
    expectedIssue: TrailWorkflowIssue,
    targetMilestoneId?: string,
  ): TrailMutationActionResult {
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planChangeTrailWorkflowIssueMilestone(readTrailPlanningState(this.runtimeStore), {
      commandId,
      expectedIssue,
      targetMilestoneId: targetMilestoneId === undefined
        ? undefined
        : normalizeTrailCommandId(targetMilestoneId, "Milestone ID"),
    });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      return { input: planned.input, kind: "needs-input" };
    }
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

  public delete(expectedIssue: TrailWorkflowIssue): TrailEntityMutationReceipt {
    const state = readTrailPlanningState(this.runtimeStore);
    const commandId = normalizeTrailCommandId(this.environment.createId(), "Command ID");
    normalizeTrailCommandTime(this.environment);
    const result = planDeleteTrailWorkflowIssue(state, { commandId, expectedIssue });
    const planned = resolveTrailApplicationPlan(result);
    if (planned.kind === "needs-input") {
      throw new Error("Workflow Issue deletion unexpectedly requires input");
    }
    return submitTrailApplicationPlan(this.sourceSync, planned.value.plan, expectedIssue.id);
  }
}
