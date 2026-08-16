import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import {
  buildTrailCommittedRuntimeCandidate,
  removeTrailDomainSource,
  replaceTrailDomainSource,
  replaceTrailPluginData,
} from "./trail-runtime-reconciler";

const project = {
  id: "project-a",
  labelIds: [],
  statusDefinitionId: "project-unstarted",
  title: "Project A",
};
const issue = {
  context: "workflow" as const,
  createdAt: 1,
  id: "issue-a",
  labelIds: [],
  projectId: "project-a",
  statusDefinitionId: "issue-unstarted",
  title: "Issue A",
};

describe("Trail runtime reconciler", () => {
  it("replaces and removes a source contribution with ownership and indexes in the same revision", () => {
    const store = createTrailRuntimeStore();
    replaceTrailDomainSource(store, {
      issues: [issue],
      kind: "project",
      milestones: [],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    });

    let state = store.getState();
    expect(state.committed.revision).toBe(1);
    expect(state.committed.ownership.sourceByEntityId.get("issue-a")).toBe("Trail/Projects/0001 Project A.md");
    expect(state.committed.indexes.issuesByProjectId.get("project-a")).toEqual(["issue-a"]);

    removeTrailDomainSource(store, "Trail/Projects/0001 Project A.md");
    state = store.getState();
    expect(state.committed.revision).toBe(2);
    expect(state.committed.authoritative.domain.projectsById.size).toBe(0);
    expect(state.committed.authoritative.domain.issuesById.size).toBe(0);
  });

  it("reconciles plugin data separately from source health", () => {
    const store = createTrailRuntimeStore();
    const pluginData = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };
    replaceTrailPluginData(store, pluginData);
    expect(store.getState().committed.authoritative.configuration).toBe(pluginData.configuration);
    expect(store.getState().committed.revision).toBe(1);
  });

  it("builds all five source carrier kinds into one candidate without publishing partial state", () => {
    const pluginData = {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    };
    const candidate = buildTrailCommittedRuntimeCandidate({
      pluginData,
      sources: [
        {
          initiative: { id: "initiative-a", labelIds: [], title: "Initiative A" },
          kind: "initiative",
          sourcePath: "Trail/Initiatives/0001 Initiative A.md",
        },
        {
          issues: [issue],
          kind: "project",
          milestones: [{ id: "milestone-a", projectId: "project-a", title: "M" }],
          project,
          sourcePath: "Trail/Projects/0001 Project A.md",
        },
        {
          issues: [{ context: "triage", due: 10, id: "triage-a", labelIds: [], title: "T" }],
          kind: "triage",
          sourcePath: "Trail/Collections/Triage.md",
        },
        {
          issues: [{ ...issue, id: "projectless-a", projectId: undefined, title: "P" }],
          kind: "projectless-issues",
          sourcePath: "Trail/Collections/Projectless Issues.md",
        },
        {
          cycles: [{ id: "cycle-a", issueIds: ["issue-a"], plannedEnd: 20, startedAt: 10 }],
          kind: "cycles",
          sourcePath: "Trail/Collections/Cycles.md",
        },
      ],
    });

    expect(candidate.authoritative.domain.initiativesById.size).toBe(1);
    expect(candidate.authoritative.domain.projectsById.size).toBe(1);
    expect(candidate.authoritative.domain.milestonesById.size).toBe(1);
    expect(candidate.authoritative.domain.issuesById.size).toBe(3);
    expect(candidate.authoritative.domain.cyclesById.size).toBe(1);
  });
});
