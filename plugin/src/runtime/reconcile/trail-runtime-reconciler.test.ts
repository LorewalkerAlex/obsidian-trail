import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration, createTrailTestWorkspaceState } from "../../test/trail-test-fixtures";
import { createTrailRuntimeStore } from "../store/trail-runtime-store";
import {
  buildTrailCommittedRuntimeCandidate,
  buildTrailRuntimeCandidateAfterChanges,
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

  it("preserves unchanged entity object references within a reconciled source", () => {
    const store = createTrailRuntimeStore();
    const secondIssue = { ...issue, id: "issue-b", title: "Issue B" };
    const sourcePath = "Trail/Projects/0001 Project A.md";
    replaceTrailDomainSource(store, {
      issues: [issue, secondIssue],
      kind: "project",
      milestones: [],
      project,
      sourcePath,
    });
    const projectBefore = store.getState().committed.authoritative.domain.projectsById.get(project.id);
    const secondBefore = store.getState().committed.authoritative.domain.issuesById.get(secondIssue.id);

    replaceTrailDomainSource(store, {
      issues: [{ ...issue, title: "Issue A changed" }, { ...secondIssue }],
      kind: "project",
      milestones: [],
      project: { ...project },
      sourcePath,
    });

    const domain = store.getState().committed.authoritative.domain;
    expect(domain.projectsById.get(project.id)).toBe(projectBefore);
    expect(domain.issuesById.get(secondIssue.id)).toBe(secondBefore);
    expect(domain.issuesById.get(issue.id)).not.toBe(issue);
    expect(domain.issuesById.get(issue.id)?.title).toBe("Issue A changed");
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

  it("builds all current source carrier kinds into one candidate without publishing partial state", () => {
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
          cycles: [{ id: "cycle-a", issueIds: ["issue-a"], plannedEnd: 20, startedAt: 10 }],
          kind: "cycles",
          sourcePath: "Trail/Collections/Cycles.md",
        },
      ],
    });

    expect(candidate.authoritative.domain.initiativesById.size).toBe(1);
    expect(candidate.authoritative.domain.projectsById.size).toBe(1);
    expect(candidate.authoritative.domain.milestonesById.size).toBe(1);
    expect(candidate.authoritative.domain.issuesById.size).toBe(2);
    expect(candidate.authoritative.domain.cyclesById.size).toBe(1);
  });
});

it("builds a multi-source post-write candidate without publishing intermediate state", () => {
  const store = createTrailRuntimeStore();
  const pluginData = {
    configuration: createTrailTestConfiguration(),
    workspaceState: createTrailTestWorkspaceState(),
  };
  replaceTrailPluginData(store, pluginData);
  replaceTrailDomainSource(store, {
    issues: [{ context: "triage", due: 10, id: "triage-a", labelIds: [], title: "T" }],
    kind: "triage",
    sourcePath: "Trail/Collections/Triage.md",
  });
  const before = store.getState().committed;
  const candidate = buildTrailRuntimeCandidateAfterChanges({
    changes: [
      { kind: "remove-domain-source", sourcePath: "Trail/Collections/Triage.md" },
      {
        kind: "replace-domain-source",
        snapshot: {
          issues: [issue],
          kind: "project",
          milestones: [],
          project,
          sourcePath: "Trail/Projects/0001 Project A.md",
        },
      },
    ],
    committed: before,
    health: store.getState().health,
  });

  expect(store.getState().committed).toBe(before);
  expect(candidate.committed.authoritative.domain.issuesById.has("triage-a")).toBe(false);
  expect(candidate.committed.authoritative.domain.issuesById.has("issue-a")).toBe(true);
});
