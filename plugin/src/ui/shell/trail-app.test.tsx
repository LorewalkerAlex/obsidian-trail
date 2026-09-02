import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
import { TrailApp } from "./trail-app";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

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
    description: "Review body",
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

  return { issue, store };
}

function uiActions(edit = vi.fn()): TrailUiActions {
  return {
    triage: {
      defer: vi.fn(),
      delete: vi.fn(),
      edit,
    },
  } as unknown as TrailUiActions;
}

describe("TrailApp", () => {
  it("keeps Foundation Lab outside product locations while Home remains the canonical initial location", () => {
    const navigationStore = createTrailNavigationStore();
    render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home" })).not.toBeInTheDocument();
  }, 15_000);

  it("dispatches the shared Triage location and its UI-action boundary to the production Triage page", async () => {
    const navigationStore = createTrailNavigationStore();
    const { issue, store: runtimeStore } = readyTriageStore();
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));
    render(
      <TrailApp
        actions={uiActions(edit)}
        navigationStore={navigationStore}
        runtimeStore={runtimeStore}
      />,
    );

    act(() => {
      navigationStore.getState().navigate({ kind: "triage" });
    });

    expect(screen.getByRole("heading", { level: 1, name: "Triage" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Real Triage row" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Edited through TrailApp" } });
    fireEvent.blur(title);

    await waitFor(() => expect(edit).toHaveBeenCalledTimes(1));
    expect(edit).toHaveBeenCalledWith(issue, expect.objectContaining({
      title: "Edited through TrailApp",
    }));
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
  });
});
