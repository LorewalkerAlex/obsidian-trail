import { describe, expect, it } from "vitest";

import type { TrailProject } from "../../domain/model/trail-entities";
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
import { selectTrailDefaultProjectSettingsReadModel } from "./trail-default-project-settings-query";

function project(
  id: string,
  title: string,
  status: "canceled" | "completed" | "started" | "unstarted" = "started",
): TrailProject {
  return {
    id,
    labelIds: [],
    statusDefinitionId: `project-${status}`,
    title,
  };
}

function readyStore(projects: readonly TrailProject[], defaultProjectId: string) {
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(defaultProjectId),
    },
    sources: projects.map((projectValue, index) => ({
      issues: [],
      kind: "project" as const,
      milestones: [],
      project: projectValue,
      sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${projectValue.title}.md`,
    })),
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

describe("Default Project Settings Query", () => {
  it("projects the current Default Project and a deterministic all-Project selector", () => {
    const store = readyStore([
      project("project-z", "Zulu"),
      project("project-a2", "Alpha"),
      project("project-a1", "Alpha", "completed"),
    ], "project-z");

    expect(selectTrailDefaultProjectSettingsReadModel(store.getState())).toEqual({
      currentProjectId: "project-z",
      projects: [
        { id: "project-a1", title: "Alpha" },
        { id: "project-a2", title: "Alpha" },
        { id: "project-z", title: "Zulu" },
      ],
    });
  });

  it("returns unavailable while Workspace State is absent", () => {
    const store = createTrailRuntimeStore();
    expect(selectTrailDefaultProjectSettingsReadModel(store.getState())).toBeNull();
  });
});
