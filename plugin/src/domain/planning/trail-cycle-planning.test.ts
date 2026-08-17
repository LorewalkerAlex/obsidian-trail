import { describe, expect, it } from "vitest";

import type { TrailCycle, TrailIssue } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planChangeTrailCycleMembership,
  planCloseTrailCycle,
  planOpenTrailCycle,
} from "./trail-cycle-planning";
import type { TrailPlanningState } from "./trail-planning-state";

function state(): TrailPlanningState & {
  readonly activeIssue: Extract<TrailIssue, { context: "workflow" }>;
  readonly closedCycle: TrailCycle;
  readonly triageIssue: Extract<TrailIssue, { context: "triage" }>;
} {
  const activeIssue: Extract<TrailIssue, { context: "workflow" }> = {
    context: "workflow",
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    statusDefinitionId: "issue-unstarted",
    title: "Active Issue",
  };
  const triageIssue: Extract<TrailIssue, { context: "triage" }> = {
    context: "triage",
    due: 50,
    id: "issue-triage",
    labelIds: [],
    title: "Triage Issue",
  };
  const closedCycle: TrailCycle = {
    endedAt: 40,
    id: "cycle-closed",
    issueIds: [activeIssue.id],
    plannedEnd: 30,
    startedAt: 10,
  };
  return {
    activeIssue,
    closedCycle,
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map([[closedCycle.id, closedCycle]]),
      initiativesById: new Map(),
      issuesById: new Map<string, TrailIssue>([
        [activeIssue.id, activeIssue],
        [triageIssue.id, triageIssue],
      ]),
      milestonesById: new Map(),
      projectsById: new Map(),
    },
    triageIssue,
    workspaceState: createTrailTestWorkspaceState(),
  };
}

describe("Cycle planning", () => {
  it("opens the only current Cycle with explicit Workflow membership", () => {
    const planning = state();
    const result = planOpenTrailCycle(planning, {
      commandId: "command-open-cycle",
      cycleId: "cycle-open",
      issueIds: [planning.activeIssue.id],
      plannedEnd: 100,
      startedAt: 60,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.cycle).toEqual({
      id: "cycle-open",
      issueIds: [planning.activeIssue.id],
      plannedEnd: 100,
      startedAt: 60,
    });
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "issue", value: planning.activeIssue },
      kind: "entity-equals",
    });
  });

  it("rejects a second open Cycle, Triage membership, and duplicate membership", () => {
    const planning = state();
    const open: TrailCycle = {
      id: "cycle-open-existing",
      issueIds: [],
      plannedEnd: 100,
      startedAt: 60,
    };
    const cyclesWithOpen = new Map(planning.domain.cyclesById);
    cyclesWithOpen.set(open.id, open);
    const withOpen = { ...planning, domain: { ...planning.domain, cyclesById: cyclesWithOpen } };
    expect(planOpenTrailCycle(withOpen, {
      commandId: "command-second-open",
      cycleId: "cycle-second",
      plannedEnd: 120,
      startedAt: 70,
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-open-exists" } });

    expect(planOpenTrailCycle(planning, {
      commandId: "command-triage-member",
      cycleId: "cycle-triage",
      issueIds: [planning.triageIssue.id],
      plannedEnd: 120,
      startedAt: 70,
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-triage-member" } });

    expect(planOpenTrailCycle(planning, {
      commandId: "command-duplicate-member",
      cycleId: "cycle-duplicate",
      issueIds: [planning.activeIssue.id, planning.activeIssue.id],
      plannedEnd: 120,
      startedAt: 70,
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-membership-duplicate" } });
  });

  it("changes membership only while the Cycle is open", () => {
    const planning = state();
    const open: TrailCycle = {
      id: "cycle-open",
      issueIds: [],
      plannedEnd: 100,
      startedAt: 60,
    };
    const cyclesWithOpen = new Map(planning.domain.cyclesById);
    cyclesWithOpen.set(open.id, open);
    const withOpen = { ...planning, domain: { ...planning.domain, cyclesById: cyclesWithOpen } };
    const changed = planChangeTrailCycleMembership(withOpen, {
      commandId: "command-membership",
      expectedCycle: open,
      issueIds: [planning.activeIssue.id],
    });
    expect(changed.kind).toBe("ready");
    if (changed.kind === "ready") {
      expect(changed.plan.cycle.issueIds).toEqual([planning.activeIssue.id]);
    }

    expect(planChangeTrailCycleMembership(planning, {
      commandId: "command-closed-membership",
      expectedCycle: planning.closedCycle,
      issueIds: [],
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-closed" } });
  });

  it("closes a Cycle without changing membership or other Issue facts", () => {
    const planning = state();
    const open: TrailCycle = {
      id: "cycle-open",
      issueIds: [planning.activeIssue.id],
      plannedEnd: 100,
      startedAt: 60,
    };
    const cyclesWithOpen = new Map(planning.domain.cyclesById);
    cyclesWithOpen.set(open.id, open);
    const withOpen = { ...planning, domain: { ...planning.domain, cyclesById: cyclesWithOpen } };
    const result = planCloseTrailCycle(withOpen, {
      commandId: "command-close",
      effectiveAt: 90,
      expectedCycle: open,
    });
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.cycle).toEqual({ ...open, endedAt: 90 });
    expect(result.plan.plan.affectedScope.entityIds).toEqual([open.id]);

    expect(planCloseTrailCycle(planning, {
      commandId: "command-close-again",
      effectiveAt: 100,
      expectedCycle: planning.closedCycle,
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-closed" } });
  });
});
