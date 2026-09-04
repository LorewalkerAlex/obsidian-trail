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

function expectSharedChassis(
  container: HTMLElement,
  expected: {
    readonly inset: "none" | "page";
    readonly scroll: "nested" | "page";
  },
): void {
  const frame = container.querySelector<HTMLElement>(".trail-workspace-frame");
  const surface = container.querySelector<HTMLElement>(".trail-page-surface");

  expect(frame).not.toBeNull();
  expect(surface).not.toBeNull();
  expect(frame).toContainElement(surface);
  expect(surface).toHaveAttribute("data-inset", expected.inset);
  expect(surface).toHaveAttribute("data-scroll", expected.scroll);
}

describe("TrailApp", () => {
  it("renders Home on the shared Page Surface instead of falling back to Foundation", () => {
    const navigationStore = createTrailNavigationStore();
    const { container } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        runtimeStore={createTrailRuntimeStore()}
        showDevelopment={false}
      />,
    );

    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
    expectSharedChassis(container, { inset: "page", scroll: "page" });
  });

  it("mounts Foundation on the same Page Surface only for the explicit development location", () => {
    const navigationStore = createTrailNavigationStore();
    act(() => navigationStore.getState().restore({ kind: "foundation" }));

    const runtimeStore = createTrailRuntimeStore();
    const { container, rerender } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        runtimeStore={runtimeStore}
        showDevelopment
      />,
    );

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expectSharedChassis(container, { inset: "none", scroll: "page" });

    rerender(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        runtimeStore={runtimeStore}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
    expectSharedChassis(container, { inset: "page", scroll: "page" });
  }, 15_000);

  it("gives Triage its Page-owned identity inside the shared nested-scroll surface", async () => {
    const navigationStore = createTrailNavigationStore();
    const { issue, store: runtimeStore } = readyTriageStore();
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));
    const { container } = render(
      <TrailApp
        actions={uiActions(edit)}
        navigationStore={navigationStore}
        runtimeStore={runtimeStore}
        showDevelopment={false}
      />,
    );

    act(() => {
      navigationStore.getState().restore({ kind: "triage" });
    });

    expect(screen.getByRole("heading", { level: 1, name: "Triage" })).toBeInTheDocument();
    expect(container.querySelector(".trail-location-bar")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-triage-page-frame__title")).toHaveTextContent("Triage");
    expectSharedChassis(container, { inset: "none", scroll: "nested" });

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
