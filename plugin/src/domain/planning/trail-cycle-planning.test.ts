import { describe, expect, it } from "vitest";

import type { TrailCycle, TrailIssue } from "../model/trail-entities";
import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import {
  planChangeTrailCycleMembership,
  planChangeTrailCyclePlannedEnd,
  planCloseAndStartNextTrailCycle,
  planCloseTrailCycle,
  planOpenTrailCycle,
} from "./trail-cycle-planning";
import type { TrailPlanningState } from "./trail-planning-state";

function state(): TrailPlanningState & {
  readonly activeIssue: Extract<TrailIssue, { context: "workflow" }>;
  readonly backlogIssue: Extract<TrailIssue, { context: "workflow" }>;
  readonly closedCycle: TrailCycle;
  readonly nextIssue: Extract<TrailIssue, { context: "workflow" }>;
  readonly triageIssue: Extract<TrailIssue, { context: "triage" }>;
} {
  const activeIssue: Extract<TrailIssue, { context: "workflow" }> = {
    context: "workflow",
    createdAt: 1,
    id: "issue-active",
    labelIds: [],
    projectId: "project-a",
    statusDefinitionId: "issue-unstarted",
    title: "Active Issue",
  };
  const backlogIssue: Extract<TrailIssue, { context: "workflow" }> = {
    ...activeIssue,
    createdAt: 2,
    id: "issue-backlog",
    title: "Backlog Issue",
  };
  const nextIssue: Extract<TrailIssue, { context: "workflow" }> = {
    ...activeIssue,
    createdAt: 3,
    id: "issue-next",
    title: "Next Issue",
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
    backlogIssue,
    closedCycle,
    configuration: createTrailTestConfiguration(),
    domain: {
      cyclesById: new Map([[closedCycle.id, closedCycle]]),
      initiativesById: new Map(),
      issuesById: new Map<string, TrailIssue>([
        [activeIssue.id, activeIssue],
        [backlogIssue.id, backlogIssue],
        [nextIssue.id, nextIssue],
        [triageIssue.id, triageIssue],
      ]),
      milestonesById: new Map(),
      projectsById: new Map(),
    },
    nextIssue,
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

  it("changes planned end only while the Cycle is open", () => {
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
    const changed = planChangeTrailCyclePlannedEnd(withOpen, {
      commandId: "command-planned-end",
      expectedCycle: open,
      plannedEnd: 120,
    });
    expect(changed.kind).toBe("ready");
    if (changed.kind === "ready") {
      expect(changed.plan.cycle).toEqual({ ...open, plannedEnd: 120 });
      expect(changed.plan.plan.intent).toBe("planning.cycle.change-planned-end");
      expect(changed.plan.plan.effects).toEqual([{
        after: { kind: "cycle", value: { ...open, plannedEnd: 120 } },
        before: { kind: "cycle", value: open },
        kind: "replace-entity",
      }]);
    }

    expect(planChangeTrailCyclePlannedEnd(planning, {
      commandId: "command-closed-planned-end",
      expectedCycle: planning.closedCycle,
      plannedEnd: 200,
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

  it("transfers overlap before close and starts the successor as one logical intent", () => {
    const planning = state();
    const source: TrailCycle = {
      id: "cycle-open",
      issueIds: [planning.activeIssue.id, planning.backlogIssue.id],
      plannedEnd: 100,
      startedAt: 60,
    };
    const cyclesWithOpen = new Map(planning.domain.cyclesById);
    cyclesWithOpen.set(source.id, source);
    const withOpen = { ...planning, domain: { ...planning.domain, cyclesById: cyclesWithOpen } };

    const result = planCloseAndStartNextTrailCycle(withOpen, {
      commandId: "command-rollover",
      cycleId: "cycle-next",
      effectiveAt: 90,
      expectedCycle: source,
      issueIds: [planning.activeIssue.id, planning.nextIssue.id],
      plannedEnd: 200,
    });

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") return;
    expect(result.plan.sourceCycle).toEqual({
      ...source,
      endedAt: 90,
      issueIds: [planning.backlogIssue.id],
    });
    expect(result.plan.nextCycle).toEqual({
      id: "cycle-next",
      issueIds: [planning.activeIssue.id, planning.nextIssue.id],
      plannedEnd: 200,
      startedAt: 90,
    });
    expect(result.plan.plan.intent).toBe("planning.cycle.close-and-start-next");
    expect(result.plan.plan.effects).toEqual([
      {
        after: { kind: "cycle", value: result.plan.sourceCycle },
        before: { kind: "cycle", value: source },
        kind: "replace-entity",
      },
      { after: { kind: "cycle", value: result.plan.nextCycle }, kind: "create-entity" },
    ]);
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "issue", value: planning.activeIssue },
      kind: "entity-equals",
    });
    expect(result.plan.plan.preconditions).toContainEqual({
      entity: { kind: "issue", value: planning.nextIssue },
      kind: "entity-equals",
    });
  });

  it("requires an open source Cycle for close-and-start-next", () => {
    const planning = state();
    expect(planCloseAndStartNextTrailCycle(planning, {
      commandId: "command-rollover-closed",
      cycleId: "cycle-next",
      effectiveAt: 90,
      expectedCycle: planning.closedCycle,
      issueIds: [],
      plannedEnd: 200,
    })).toMatchObject({ kind: "rejected", reason: { code: "cycle-closed" } });
  });
});
