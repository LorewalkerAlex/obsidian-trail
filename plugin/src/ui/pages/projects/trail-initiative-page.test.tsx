import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailInitiative,
  TrailProject,
} from "../../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { createTrailNavigationStore } from "../../shell/trail-navigation-state";
import { TrailApp } from "../../shell/trail-app";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

const NOW = Date.UTC(2026, 8, 12, 9);

function readyInitiativeStore() {
  const configuration = createTrailTestConfiguration();
  const initiative: TrailInitiative = {
    description: "Keep the scoped Project portfolio calm and coherent.",
    id: "initiative-alpha",
    labelIds: [],
    title: "Initiative Alpha",
  };
  const activeProject: TrailProject = {
    id: "project-active",
    initiativeId: initiative.id,
    labelIds: [],
    priority: "high",
    statusDefinitionId: "project-started",
    title: "Active Project",
  };
  const completedProject: TrailProject = {
    id: "project-completed",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-completed",
    title: "Completed Project",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(activeProject.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative Alpha.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: activeProject,
        sourcePath: "Trail/Projects/0001 Active Project.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: completedProject,
        sourcePath: "Trail/Projects/0002 Completed Project.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { initiative, store };
}

function renderInitiativePage() {
  const { initiative, store: runtimeStore } = readyInitiativeStore();
  const createFromDraft = vi.fn(() => ({
    commandId: "command-create-project",
    completion: Promise.resolve(),
    entityId: "project-created",
  }));
  const actions = {
    projects: { createFromDraft },
  } as unknown as TrailUiActions;
  const navigationStore = createTrailNavigationStore({
    initiativeId: initiative.id,
    kind: "initiative",
  });
  const onNavigate = vi.fn();
  const renderMarkdown = vi.fn((markdown: string, container: HTMLElement) => {
    container.textContent = markdown;
    return {
      completion: Promise.resolve(),
      dispose: () => container.replaceChildren(),
    };
  }) satisfies TrailMarkdownRender;

  render(
    <TrailApp
      actions={actions}
      navigationStore={navigationStore}
      onNavigate={onNavigate}
      renderMarkdown={renderMarkdown}
      runtimeStore={runtimeStore}
      showDevelopment={false}
    />,
  );

  return {
    createFromDraft,
    initiative,
    navigationStore,
    onNavigate,
    renderMarkdown,
  };
}

describe("TrailInitiativePage", () => {
  it("composes the flat scoped Project List with all lifecycle states and the Initiative Filter registry", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const { renderMarkdown } = renderInitiativePage();

    expect(screen.getByRole("heading", { level: 1, name: "Initiative Alpha" }))
      .toBeInTheDocument();
    expect(screen.getByText("Keep the scoped Project portfolio calm and coherent."))
      .toHaveClass("trail-page-narrative__content");
    expect(renderMarkdown).toHaveBeenCalledWith(
      "Keep the scoped Project portfolio calm and coherent.",
      expect.any(HTMLElement),
    );
    expect(screen.getByRole("button", { name: "Active Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed Project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Timeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();

    const controls = screen.getByRole("group", { name: "Initiative project view controls" });
    fireEvent.click(within(controls).getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Due" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Initiative" })).not.toBeInTheDocument();
  });

  it("shares Project selection mechanics and clears the scoped selection with Escape", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const { onNavigate } = renderInitiativePage();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Active Project" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Completed Project" }), {
      shiftKey: true,
    });
    expect(screen.getByRole("checkbox", { name: "Deselect Active Project" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Deselect Completed Project" })).toBeChecked();

    const page = screen.getByRole("region", { name: "Initiative Alpha initiative" });
    fireEvent.keyDown(page, { key: "Escape" });
    expect(screen.getByRole("checkbox", { name: "Select Active Project" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Completed Project" })).not.toBeChecked();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("keeps stable navigation host-aware and treats the Initiative Composer prefill as clean context", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const {
      createFromDraft,
      initiative,
      navigationStore,
      onNavigate,
    } = renderInitiativePage();

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "projects" });
    expect(navigationStore.getState().location).toEqual({
      initiativeId: initiative.id,
      kind: "initiative",
    });

    fireEvent.click(screen.getByRole("button", { name: "Active Project" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "project", projectId: "project-active" });

    fireEvent.click(screen.getByRole("button", { name: "Add project" }));
    const firstDialog = screen.getByRole("dialog", { name: "Project" });
    expect(within(firstDialog).getByRole("button", { name: "Initiative: Initiative Alpha" }))
      .toBeInTheDocument();
    fireEvent.keyDown(firstDialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Project" }))
      .not.toBeInTheDocument());
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add project" }));
    const secondDialog = screen.getByRole("dialog", { name: "Project" });
    fireEvent.change(within(secondDialog).getByRole("textbox", { name: "Project title" }), {
      target: { value: "Initiative-scoped Project" },
    });
    fireEvent.click(within(secondDialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createFromDraft).toHaveBeenCalledTimes(1));
    expect(createFromDraft).toHaveBeenCalledWith({
      description: "",
      due: undefined,
      initiativeId: initiative.id,
      labelIds: [],
      priority: undefined,
      title: "Initiative-scoped Project",
    });
  });
});
