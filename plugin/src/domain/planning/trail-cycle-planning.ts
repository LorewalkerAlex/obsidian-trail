import type { TrailCycle, TrailWorkflowIssue } from "../model/trail-entities";
import type { TrailTimestamp } from "../model/trail-values";
import { sameTrailDomainEntity } from "../rules/trail-domain-equality";
import { findTrailOpenCycle, isTrailCycleOpen } from "../rules/trail-cycle-rules";
import { createTrailMutationPlan, type TrailMutationPlan } from "../../mutation/plans/trail-mutation-plan";
import { readyTrailPlan, rejectTrailPlan, type TrailPlanResult } from "./trail-plan-result";
import { trailPlanningEntityExists, type TrailPlanningState } from "./trail-planning-state";

export interface OpenTrailCycleCommand {
  readonly commandId: string;
  readonly cycleId: string;
  readonly issueIds?: readonly string[];
  readonly plannedEnd: TrailTimestamp;
  readonly startedAt: TrailTimestamp;
}

export interface ChangeTrailCycleMembershipCommand {
  readonly commandId: string;
  readonly expectedCycle: TrailCycle;
  readonly issueIds: readonly string[];
}

export interface CloseTrailCycleCommand {
  readonly commandId: string;
  readonly effectiveAt: TrailTimestamp;
  readonly expectedCycle: TrailCycle;
}

export interface TrailCyclePlan {
  readonly cycle: TrailCycle;
  readonly plan: TrailMutationPlan;
}

interface TrailCycleMembershipResolution {
  readonly issues?: readonly TrailWorkflowIssue[];
  readonly rejection?: { readonly code: string; readonly message: string };
}

function resolveTrailCycleMembership(
  state: TrailPlanningState,
  issueIds: readonly string[],
): TrailCycleMembershipResolution {
  const seen = new Set<string>();
  const issues: TrailWorkflowIssue[] = [];
  for (const issueId of issueIds) {
    if (seen.has(issueId)) {
      return {
        rejection: {
          code: "cycle-membership-duplicate",
          message: `Cycle membership contains duplicate Issue ID: ${issueId}`,
        },
      };
    }
    seen.add(issueId);

    const issue = state.domain.issuesById.get(issueId);
    if (issue === undefined) {
      return {
        rejection: { code: "issue-missing", message: `Issue does not exist: ${issueId}` },
      };
    }
    if (issue.context !== "workflow") {
      return {
        rejection: {
          code: "cycle-triage-member",
          message: `Triage Issue cannot be a Cycle member: ${issueId}`,
        },
      };
    }
    issues.push(issue);
  }
  return { issues };
}

function currentTrailCycle(
  state: TrailPlanningState,
  expectedCycle: TrailCycle,
): TrailPlanResult<TrailCycle> {
  const current = state.domain.cyclesById.get(expectedCycle.id);
  if (current === undefined) {
    return rejectTrailPlan("cycle-missing", `Cycle does not exist: ${expectedCycle.id}`);
  }
  if (!sameTrailDomainEntity(
    { kind: "cycle", value: current },
    { kind: "cycle", value: expectedCycle },
  )) {
    return rejectTrailPlan("cycle-changed", `Cycle changed before action: ${expectedCycle.id}`);
  }
  return readyTrailPlan(current);
}

export function planOpenTrailCycle(
  state: TrailPlanningState,
  command: OpenTrailCycleCommand,
): TrailPlanResult<TrailCyclePlan> {
  if (trailPlanningEntityExists(state.domain, command.cycleId)) {
    return rejectTrailPlan("entity-id-conflict", `Trail entity ID already exists: ${command.cycleId}`);
  }
  const current = findTrailOpenCycle(state.domain.cyclesById.values());
  if (current !== undefined) {
    return rejectTrailPlan("cycle-open-exists", `Cycle is already open: ${current.id}`);
  }

  const membership = resolveTrailCycleMembership(state, command.issueIds ?? []);
  if (membership.rejection !== undefined) {
    return rejectTrailPlan(membership.rejection.code, membership.rejection.message);
  }
  const issues = membership.issues ?? [];
  const cycle: TrailCycle = {
    id: command.cycleId,
    issueIds: issues.map(({ id }) => id).sort(),
    plannedEnd: command.plannedEnd,
    startedAt: command.startedAt,
  };
  return readyTrailPlan({
    cycle,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{ after: { kind: "cycle", value: cycle }, kind: "create-entity" }],
      intent: "planning.cycle.open",
      preconditions: issues.map((issue) => ({
        entity: { kind: "issue" as const, value: issue },
        kind: "entity-equals" as const,
      })),
    }),
  });
}

export function planChangeTrailCycleMembership(
  state: TrailPlanningState,
  command: ChangeTrailCycleMembershipCommand,
): TrailPlanResult<TrailCyclePlan> {
  const currentResult = currentTrailCycle(state, command.expectedCycle);
  if (currentResult.kind !== "ready") return currentResult;
  const current = currentResult.plan;
  if (!isTrailCycleOpen(current)) {
    return rejectTrailPlan("cycle-closed", `Closed Cycle membership cannot be changed: ${current.id}`);
  }

  const membership = resolveTrailCycleMembership(state, command.issueIds);
  if (membership.rejection !== undefined) {
    return rejectTrailPlan(membership.rejection.code, membership.rejection.message);
  }
  const issues = membership.issues ?? [];
  const candidate: TrailCycle = { ...current, issueIds: issues.map(({ id }) => id).sort() };
  const cycle = sameTrailDomainEntity(
    { kind: "cycle", value: current },
    { kind: "cycle", value: candidate },
  ) ? current : candidate;

  return readyTrailPlan({
    cycle,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "cycle", value: cycle },
        before: { kind: "cycle", value: current },
        kind: "replace-entity",
      }],
      intent: "planning.cycle.change-membership",
      preconditions: issues.map((issue) => ({
        entity: { kind: "issue" as const, value: issue },
        kind: "entity-equals" as const,
      })),
    }),
  });
}

export function planCloseTrailCycle(
  state: TrailPlanningState,
  command: CloseTrailCycleCommand,
): TrailPlanResult<TrailCyclePlan> {
  const currentResult = currentTrailCycle(state, command.expectedCycle);
  if (currentResult.kind !== "ready") return currentResult;
  const current = currentResult.plan;
  if (!isTrailCycleOpen(current)) {
    return rejectTrailPlan("cycle-closed", `Cycle is already closed: ${current.id}`);
  }

  const cycle: TrailCycle = { ...current, endedAt: command.effectiveAt };
  return readyTrailPlan({
    cycle,
    plan: createTrailMutationPlan({
      commandId: command.commandId,
      effects: [{
        after: { kind: "cycle", value: cycle },
        before: { kind: "cycle", value: current },
        kind: "replace-entity",
      }],
      intent: "planning.cycle.close",
    }),
  });
}
