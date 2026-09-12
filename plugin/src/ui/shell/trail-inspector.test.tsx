import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { TrailInspector } from "./trail-inspector";
import { createTrailInspectorStore } from "./trail-inspector-state";
import type { TrailUiActions } from "./trail-ui-actions";

function actions(): TrailUiActions {
  return {
    initiatives: {
      create: vi.fn(),
      editProperties: vi.fn(),
    },
    milestones: {
      create: vi.fn(),
      delete: vi.fn(),
      editProperties: vi.fn(),
    },
    projects: {
      changeInitiative: vi.fn(),
      changeStatus: vi.fn(),
      create: vi.fn(),
      createFromDraft: vi.fn(),
      editProperties: vi.fn(),
    },
  } as unknown as TrailUiActions;
}

describe("TrailInspector", () => {
  it("dispatches an Initiative target into real Initiative Inspector content", () => {
    const inspectorStore = createTrailInspectorStore();
    act(() => inspectorStore.getState().restore({
      initiativeId: "initiative-a",
      kind: "initiative",
    }));

    render(
      <TrailInspector
        actions={actions()}
        inspectorStore={inspectorStore}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Initiative A" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Inspector content has not been implemented yet."))
      .not.toBeInTheDocument();
  });

  it("dispatches a Project target into real Project Inspector content", () => {
    const inspectorStore = createTrailInspectorStore();
    act(() => inspectorStore.getState().restore({
      kind: "project",
      projectId: "project-a",
    }));

    render(
      <TrailInspector
        actions={actions()}
        inspectorStore={inspectorStore}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Project A" })).toBeInTheDocument();
    expect(screen.queryByText("Inspector content has not been implemented yet."))
      .not.toBeInTheDocument();
  });

  it("dispatches an Issue target into real Issue Inspector content", () => {
    const inspectorStore = createTrailInspectorStore();
    act(() => inspectorStore.getState().restore({
      issueId: "issue-a",
      kind: "issue",
    }));

    render(
      <TrailInspector
        actions={actions()}
        inspectorStore={inspectorStore}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Issue data is not available.")).toBeInTheDocument();
    expect(screen.queryByText("Inspector content has not been implemented yet."))
      .not.toBeInTheDocument();
  });

  it("dispatches a Cycle target into real Cycle Inspector content", () => {
    const inspectorStore = createTrailInspectorStore();
    act(() => inspectorStore.getState().restore({
      cycleId: "cycle-a",
      kind: "cycle",
    }));

    render(
      <TrailInspector
        actions={actions()}
        inspectorStore={inspectorStore}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Cycle data is not available.")).toBeInTheDocument();
    expect(screen.queryByText("Inspector content has not been implemented yet."))
      .not.toBeInTheDocument();
  });
});
