import { describe, expect, it } from "vitest";

import { createEmptyTrailDomainState } from "../store/trail-runtime-store";
import { buildTrailRuntimeIndexes } from "./trail-runtime-indexes";

function indexedDomain() {
  const domain = createEmptyTrailDomainState();
  return {
    cyclesById: new Map(domain.cyclesById).set("cycle-closed", {
      endedAt: 30,
      id: "cycle-closed",
      issueIds: ["issue-a"],
      plannedEnd: 20,
      startedAt: 10,
    }).set("cycle-open", {
      id: "cycle-open",
      issueIds: ["issue-a"],
      plannedEnd: 50,
      startedAt: 40,
    }),
    initiativesById: new Map(domain.initiativesById).set("initiative-a", {
      id: "initiative-a",
      labelIds: ["label-work"],
      title: "Initiative A",
    }),
    issuesById: new Map(domain.issuesById).set("issue-a", {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: ["label-focus", "label-work"],
      milestoneId: "milestone-a",
      projectId: "project-a",
      statusDefinitionId: "issue-started",
      title: "Issue A",
    }).set("triage-a", {
      context: "triage",
      due: 2,
      id: "triage-a",
      labelIds: ["label-focus"],
      title: "Triage A",
    }),
    milestonesById: new Map(domain.milestonesById).set("milestone-a", {
      id: "milestone-a",
      projectId: "project-a",
      title: "Milestone A",
    }),
    projectsById: new Map(domain.projectsById).set("project-a", {
      id: "project-a",
      initiativeId: "initiative-a",
      labelIds: ["label-work"],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    }),
  };
}

describe("Trail runtime indexes", () => {
  it("materializes the frozen structural and reference dimensions deterministically", () => {
    const indexes = buildTrailRuntimeIndexes(indexedDomain());

    expect(indexes.projectsByInitiativeId.get("initiative-a")).toEqual(["project-a"]);
    expect(indexes.milestonesByProjectId.get("project-a")).toEqual(["milestone-a"]);
    expect(indexes.issuesByProjectId.get("project-a")).toEqual(["issue-a"]);
    expect(indexes.issuesByMilestoneId.get("milestone-a")).toEqual(["issue-a"]);
    expect(indexes.issuesByCycleId.get("cycle-closed")).toEqual(["issue-a"]);
    expect(indexes.issuesByCycleId.get("cycle-open")).toEqual(["issue-a"]);
    expect(indexes.cyclesByIssueId.get("issue-a")).toEqual(["cycle-closed", "cycle-open"]);
    expect(indexes.currentCycleId).toBe("cycle-open");
    expect(indexes.entityRefsByLabelId.get("label-focus")).toEqual(["issue-a", "triage-a"]);
    expect(indexes.entityRefsByLabelId.get("label-work")).toEqual([
      "initiative-a",
      "issue-a",
      "project-a",
    ]);
    expect(indexes.entityRefsByStatusDefinitionId.get("issue-started")).toEqual(["issue-a"]);
    expect(indexes.entityRefsByStatusDefinitionId.get("project-unstarted")).toEqual(["project-a"]);
  });

  it("does not guess a current Cycle when invalid input contains multiple open Cycles", () => {
    const domain = indexedDomain();
    const cyclesById = new Map(domain.cyclesById).set("cycle-second-open", {
      id: "cycle-second-open",
      issueIds: [],
      plannedEnd: 70,
      startedAt: 60,
    });

    expect(buildTrailRuntimeIndexes({ ...domain, cyclesById }).currentCycleId).toBeUndefined();
  });
});
