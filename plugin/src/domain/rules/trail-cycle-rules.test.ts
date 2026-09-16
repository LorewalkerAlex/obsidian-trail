import { describe, expect, it } from "vitest";

import type { TrailCycle, TrailIssue } from "../model/trail-entities";
import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import {
  findTrailOpenCycle,
  isTrailCycleOpen,
  resolveTrailNextCycleCandidateIssueIds,
} from "./trail-cycle-rules";

function issues(): ReadonlyMap<string, TrailIssue> {
  return new Map<string, TrailIssue>([
    ["issue-active", {
      context: "workflow",
      createdAt: 1,
      id: "issue-active",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-unstarted",
      title: "Active",
    }],
    ["issue-completed", {
      context: "workflow",
      createdAt: 1,
      estimate: "medium",
      id: "issue-completed",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-completed",
      terminalAt: 20,
      title: "Completed",
    }],
    ["issue-canceled", {
      context: "workflow",
      createdAt: 1,
      id: "issue-canceled",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-canceled",
      terminalAt: 21,
      title: "Canceled",
    }],
  ]);
}

describe("Trail Cycle rules", () => {
  it("identifies the open Cycle", () => {
    const closed: TrailCycle = {
      endedAt: 10,
      id: "cycle-closed",
      issueIds: [],
      plannedEnd: 9,
      startedAt: 1,
    };
    const open: TrailCycle = {
      id: "cycle-open",
      issueIds: [],
      plannedEnd: 30,
      startedAt: 11,
    };
    expect(isTrailCycleOpen(closed)).toBe(false);
    expect(isTrailCycleOpen(open)).toBe(true);
    expect(findTrailOpenCycle([closed, open])).toBe(open);
  });

  it("offers every current non-terminal member from an open source Cycle", () => {
    const open: TrailCycle = {
      id: "cycle-open",
      issueIds: ["issue-completed", "issue-active", "issue-canceled"],
      plannedEnd: 20,
      startedAt: 1,
    };
    expect(resolveTrailNextCycleCandidateIssueIds(
      createTrailTestConfiguration(),
      open,
      issues(),
    )).toEqual(["issue-active"]);
  });

  it("requires open and internally legal Cycle membership for candidate resolution", () => {
    const closed: TrailCycle = {
      endedAt: 30,
      id: "cycle-closed",
      issueIds: ["issue-active"],
      plannedEnd: 20,
      startedAt: 1,
    };
    expect(() => resolveTrailNextCycleCandidateIssueIds(
      createTrailTestConfiguration(),
      closed,
      issues(),
    )).toThrow("open Cycle");

    const missing: TrailCycle = { ...closed, endedAt: undefined, issueIds: ["missing"] };
    expect(() => resolveTrailNextCycleCandidateIssueIds(
      createTrailTestConfiguration(),
      missing,
      issues(),
    )).toThrow("missing Issue");
  });
});
