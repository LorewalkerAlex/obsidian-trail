import { describe, expect, it } from "vitest";

import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import {
  selectTrailDefaultTriageAcceptProjectId,
  selectTrailReadableDefaultProject,
  selectTrailTriageAcceptProjectIds,
} from "./trail-project-target-query";

function readyStore(input: {
  readonly defaultProjectId?: string;
  readonly projectAStatus?: string;
  readonly projectBStatus?: string;
} = {}) {
  const projectA = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: input.projectAStatus ?? "project-unstarted",
    title: "Zulu",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: input.projectBStatus ?? "project-completed",
    title: "Alpha",
  };
  const workspaceState = {
    ...createTrailTestWorkspaceState(),
    ...(input.defaultProjectId === undefined
      ? {}
      : { defaultProjectId: input.defaultProjectId }),
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState,
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectA,
        sourcePath: "Trail/Projects/0001 Zulu.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Alpha.md",
      },
      { issues: [], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { projectA, projectB, store };
}

describe("Project target Query", () => {
  it("resolves Default Project by stable Workspace reference without title semantics", () => {
    const { projectA, store } = readyStore({ defaultProjectId: "project-a" });
    expect(selectTrailReadableDefaultProject(store.getState())).toBe(projectA);
  });

  it("offers only Projects that can accept the Backlog Issue created by Triage Accept", () => {
    const { projectA, store } = readyStore({ defaultProjectId: "project-a" });
    expect(selectTrailTriageAcceptProjectIds(store.getState())).toEqual([projectA.id]);
    expect(selectTrailDefaultTriageAcceptProjectId(store.getState())).toBe(projectA.id);
  });

  it("does not preselect a terminal, absent, or dangling Default Project", () => {
    const terminal = readyStore({
      defaultProjectId: "project-b",
      projectAStatus: "project-unstarted",
      projectBStatus: "project-completed",
    });
    expect(selectTrailReadableDefaultProject(terminal.store.getState())).toBe(terminal.projectB);
    expect(selectTrailDefaultTriageAcceptProjectId(terminal.store.getState())).toBeUndefined();

    const absent = readyStore();
    expect(selectTrailReadableDefaultProject(absent.store.getState())).toBeUndefined();
    expect(selectTrailDefaultTriageAcceptProjectId(absent.store.getState())).toBeUndefined();

    const dangling = readyStore({ defaultProjectId: "project-missing" });
    expect(selectTrailReadableDefaultProject(dangling.store.getState())).toBeUndefined();
    expect(selectTrailDefaultTriageAcceptProjectId(dangling.store.getState())).toBeUndefined();
  });
});
