import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailProject, TrailWorkflowIssue } from "../../../domain/model/trail-entities";
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
import { TrailProjectWorkspacePage } from "./trail-project-workspace-page";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore(projectStatus = "project-started") {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: projectStatus,
    title: "Project A",
  };
  const issues: TrailWorkflowIssue[] = [
    {
      context: "workflow",
      createdAt: 1,
      estimate: "medium",
      id: "issue-started",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-started",
      title: "Started issue",
    },
    {
      context: "workflow",
      createdAt: 2,
      id: "issue-started-2",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-started",
      title: "Second started issue",
    },
    {
      context: "workflow",
      createdAt: 3,
      id: "issue-backlog",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-backlog",
      title: "Backlog issue",
    },
    {
      context: "workflow",
      createdAt: 4,
      estimate: "small",
      id: "issue-done",
      labelIds: [],
      projectId: project.id,
      statusDefinitionId: "issue-completed",
      title: "Done issue",
    },
  ];
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [{
      issues,
      kind: "project",
      milestones: [],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

function actions() {
  return {
    changeStatus: vi.fn((expectedIssue: TrailWorkflowIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    })),
    createFromDraft: vi.fn(() => ({
      commandId: "command-create",
      completion: Promise.resolve(),
      entityId: "new-issue",
    })),
    delete: vi.fn((expectedIssue: TrailWorkflowIssue) => ({
      commandId: `delete-${expectedIssue.id}`,
      completion: Promise.resolve(),
      entityId: expectedIssue.id,
    })),
    moveToProject: vi.fn((expectedIssue: TrailWorkflowIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    })),
  };
}

function renderPage(projectStatus = "project-started") {
  const store = readyStore(projectStatus);
  const result = render(
    <TrailProjectWorkspacePage
      actions={actions()}
      onInitiativeActivate={vi.fn()}
      onProjectsActivate={vi.fn()}
      projectId="project-a"
      renderMarkdown={renderMarkdown}
      runtimeStore={store}
    />,
  );
  return { ...result, store };
}

describe("Project Workspace Board", () => {
  it("exposes Board only for a Started Project and projects Todo, In Progress, Done columns", () => {
    const { container } = renderPage();

    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    const board = screen.getByRole("region", { name: "Project issue board" });
    const columns = Array.from(board.querySelectorAll<HTMLElement>(".trail-board__column"));
    expect(columns.map((column) => column.dataset.workflowIssueStatusDropTarget)).toEqual([
      "issue-unstarted",
      "issue-started",
      "issue-completed",
    ]);
    expect(within(board).getByText("Started issue")).toBeInTheDocument();
    expect(within(board).getByText("Second started issue")).toBeInTheDocument();
    expect(within(board).getByText("Done issue")).toBeInTheDocument();
    expect(within(board).queryByText("Backlog issue")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-workflow-issue-card='true']")).toHaveLength(3);
    expect(container.querySelectorAll("[data-workflow-issue-row='true']")).toHaveLength(0);
  });

  it("reconciles retained List selection to the Board-visible projection", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Started issue" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Backlog issue" }));
    expect(screen.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("2 selected");

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    await waitFor(() => {
      expect(screen.getByRole("toolbar", { name: "Selection actions" }))
        .toHaveTextContent("1 selected");
    });
    expect(screen.getByRole("checkbox", { name: "Deselect Started issue" })).toBeChecked();
    expect(screen.queryByText("Backlog issue")).not.toBeInTheDocument();
  });


  it("returns keyboard ownership to the Project surface when Escape clears selection", async () => {
    const { container } = renderPage();
    const page = container.querySelector<HTMLElement>(".trail-project-workspace-page");
    const checkbox = screen.getByRole("checkbox", { name: "Select Started issue" });
    expect(page).not.toBeNull();
    if (page === null) return;

    fireEvent.click(checkbox);
    checkbox.focus();
    expect(checkbox).toHaveFocus();

    fireEvent.keyDown(checkbox, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("toolbar", { name: "Selection actions" }))
        .not.toBeInTheDocument();
    });
    expect(page).toHaveAttribute("tabindex", "-1");
    expect(page).toHaveFocus();
  });

  it("lets a blank-surface pointer restore Page focus so Escape can clear retained selection", async () => {
    const { container } = renderPage();
    const page = container.querySelector<HTMLElement>(".trail-project-workspace-page");
    const content = container.querySelector<HTMLElement>(".trail-project-workspace-page__content");
    expect(page).not.toBeNull();
    expect(content).not.toBeNull();
    if (page === null || content === null) return;

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Started issue" }));
    const checkbox = screen.getByRole("checkbox", { name: "Deselect Started issue" });
    checkbox.focus();
    checkbox.blur();
    expect(page).not.toHaveFocus();

    fireEvent.pointerDown(content);
    expect(page).toHaveFocus();
    fireEvent.keyDown(page, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("toolbar", { name: "Selection actions" }))
        .not.toBeInTheDocument();
    });
  });

  it("keeps the Project surface as the focus fallback when Bulk Bar clear unmounts its trigger", async () => {
    const { container } = renderPage();
    const page = container.querySelector<HTMLElement>(".trail-project-workspace-page");
    expect(page).not.toBeNull();
    if (page === null) return;

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Started issue" }));
    const clear = screen.getByRole("button", { name: "Clear selection" });
    clear.focus();
    expect(clear).toHaveFocus();
    fireEvent.click(clear);

    await waitFor(() => {
      expect(screen.queryByRole("toolbar", { name: "Selection actions" }))
        .not.toBeInTheDocument();
    });
    expect(page).toHaveFocus();
  });

  it("enables one same-Status selected drag scope and disables a selected mixed-Status scope", async () => {
    renderPage();

    const handleFor = (title: string) => {
      const item = screen.getByText(title).closest<HTMLElement>("[data-workflow-issue-id]");
      return item?.querySelector<HTMLElement>("[data-workflow-issue-drag-handle='true']") ?? null;
    };

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Started issue" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Second started issue" }));

    await waitFor(() => {
      expect(handleFor("Started issue")).toHaveAttribute("data-status-drag-available", "true");
      expect(handleFor("Second started issue")).toHaveAttribute("data-status-drag-available", "true");
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Done issue" }));

    await waitFor(() => {
      expect(handleFor("Started issue")).not.toHaveAttribute("data-status-drag-available");
      expect(handleFor("Second started issue")).not.toHaveAttribute("data-status-drag-available");
      expect(handleFor("Done issue")).not.toHaveAttribute("data-status-drag-available");
    });
    expect(handleFor("Backlog issue")).toHaveAttribute("data-status-drag-available", "true");
  });

  it("does not expose the Board layout control outside the Started Project lifecycle", () => {
    renderPage("project-canceled");

    expect(screen.queryByRole("button", { name: "Board" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Project issue board" })).not.toBeInTheDocument();
  });
});
