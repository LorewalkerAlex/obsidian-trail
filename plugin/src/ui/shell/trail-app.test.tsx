import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  TrailProject,
  TrailTriageIssue,
} from "../../domain/model/trail-entities";
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
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";
import { TrailApp } from "./trail-app";

function readyTriageStore() {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue: TrailTriageIssue = {
    context: "triage",
    due: Date.UTC(2026, 8, 3, 4),
    id: "triage-a",
    labelIds: [],
    priority: "high",
    title: "Real Triage row",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [issue],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return store;
}

describe("TrailApp", () => {
  it("keeps Foundation Lab outside product locations while Home remains the canonical initial location", () => {
    const navigationStore = createTrailNavigationStore();
    render(
      <TrailApp
        actions={{} as TrailUiActions}
        navigationStore={navigationStore}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home" })).not.toBeInTheDocument();
  }, 15_000);

  it("dispatches the shared Triage location to the production Triage page", () => {
    const navigationStore = createTrailNavigationStore();
    const runtimeStore = readyTriageStore();
    render(
      <TrailApp
        actions={{} as TrailUiActions}
        navigationStore={navigationStore}
        runtimeStore={runtimeStore}
      />,
    );

    act(() => {
      navigationStore.getState().navigate({ kind: "triage" });
    });

    expect(screen.getByRole("heading", { level: 1, name: "Triage" })).toBeInTheDocument();
    expect(screen.getByText("Real Triage row")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
  });
});
