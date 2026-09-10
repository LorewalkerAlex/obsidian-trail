import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
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
import {
  TrailActionMenuProvider,
} from "../../interactions/trail-action-menu-context";
import type {
  TrailActionMenuPosition,
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../../interactions/trail-action-menu";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { TrailProjectWorkspacePage } from "./trail-project-workspace-page";

const NOW = Date.UTC(2026, 8, 12, 9);

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore(statusDefinitionId = "project-started") {
  const configuration = createTrailTestConfiguration();
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    description: "Project workspace narrative",
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId,
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Workspace pass",
  };
  const issues: TrailWorkflowIssue[] = [
    {
      context: "workflow",
      createdAt: NOW - 10_000,
      due: NOW + 86_400_000,
      estimate: "large",
      id: "issue-started",
      labelIds: ["label-work"],
      milestoneId: milestone.id,
      priority: "high",
      projectId: project.id,
      statusDefinitionId: "issue-started",
      title: "Build the Project list",
    },
    {
      context: "workflow",
      createdAt: NOW,
      id: "issue-done",
      labelIds: [],
      priority: "low",
      projectId: project.id,
      statusDefinitionId: "issue-completed",
      title: "Close the previous slice",
    },
  ];
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues,
        kind: "project",
        milestones: [milestone],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { store };
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

describe("TrailProjectWorkspacePage", () => {
  it("composes Project identity, narrative, the complete Status skeleton, Issue rows, and the frozen Filter registry", () => {
    const { store } = readyStore();
    const { container } = render(
      <TrailProjectWorkspacePage
        actions={actions()}
        onInitiativeActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Project A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Initiative A" })).toBeInTheDocument();
    expect(screen.getByText("Project workspace narrative"))
      .toHaveClass("trail-page-narrative__content");

    for (const label of ["backlog", "unstarted", "started", "completed", "canceled"]) {
      expect(container.querySelector(`.trail-project-workspace-page__status-section [aria-label*="${label}"]`))
        .not.toBeNull();
    }
    expect(screen.getByText("Build the Project list")).toBeInTheDocument();
    expect(screen.getByText("Workspace pass")).toBeInTheDocument();
    expect(screen.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(screen.getByText("Close the previous slice")).toBeInTheDocument();
    const startedSection = screen.getByRole("region", { name: "started issues" });
    expect(within(startedSection).getByRole("img", { name: "started status" }))
      .toHaveAttribute("data-status-category", "started");
    const completedSection = screen.getByRole("region", { name: "completed issues" });
    expect(within(completedSection).getByRole("img", { name: "completed status" }))
      .toHaveAttribute("data-status-category", "completed");

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    const filter = screen.getByRole("dialog", { name: "Filter" });
    for (const property of ["Status", "Priority", "Milestone", "Labels", "Due", "Estimate"]) {
      expect(within(filter).getByRole("button", { name: property })).toBeInTheDocument();
    }
  });

  it("keeps the Status skeleton when filters hide every Issue and exposes Clear filters", () => {
    const { store } = readyStore();
    const { container } = render(
      <TrailProjectWorkspacePage
        actions={actions()}
        onInitiativeActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "Urgent" }));

    expect(screen.getByText("No issues match the filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(container.querySelectorAll(".trail-project-workspace-page__status-section"))
      .toHaveLength(5);
    expect(screen.queryByText("Build the Project list")).not.toBeInTheDocument();
  });

  it("supports visible-range Issue selection without opening Peek and clears it with Escape", () => {
    const { store } = readyStore();
    const { container } = render(
      <TrailProjectWorkspacePage
        actions={actions()}
        onInitiativeActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    const first = screen.getByRole("checkbox", { name: "Select Build the Project list" });
    fireEvent.click(first);
    expect(screen.getByRole("checkbox", { name: "Deselect Build the Project list" }))
      .toBeChecked();
    expect(container.querySelector(".trail-issue-peek")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Close the previous slice" }), {
      shiftKey: true,
    });
    expect(screen.getByRole("checkbox", { name: "Deselect Close the previous slice" }))
      .toBeChecked();

    const completedRow = screen.getByText("Close the previous slice")
      .closest<HTMLElement>("[data-workflow-issue-row='true']");
    expect(completedRow).not.toBeNull();
    if (completedRow === null) return;
    fireEvent.keyDown(completedRow, { key: "Escape" });

    expect(screen.getByRole("checkbox", { name: "Select Build the Project list" }))
      .not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Close the previous slice" }))
      .not.toBeChecked();
  });

  it("resolves a selected Issue context menu through the shared registry without changing selection", async () => {
    const { store } = readyStore();
    const issueActions = actions();
    let itemIds: readonly string[] = [];
    let invokeCancel: (() => void | Promise<void>) | undefined;
    const presenter: TrailActionMenuPresenter = {
      showAtMouseEvent<TActionId extends string>(
        _event: MouseEvent,
        request: TrailActionMenuRequest<TActionId>,
      ): void {
        itemIds = request.items.map(({ id }) => id);
        const cancel = request.items.find(({ id }) => id === "issue.cancel");
        invokeCancel = cancel === undefined
          ? undefined
          : () => request.onSelect(cancel.id, cancel.targets[0]?.id);
      },
      showAtPosition(): void {
        // This consumer proves the pointer context-menu path only.
      },
    };

    render(
      <TrailActionMenuProvider presenter={presenter}>
        <TrailProjectWorkspacePage
          actions={issueActions}
          onInitiativeActivate={vi.fn()}
          onProjectsActivate={vi.fn()}
          projectId="project-a"
          renderMarkdown={renderMarkdown}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Build the Project list" }));
    const row = screen.getByText("Build the Project list")
      .closest<HTMLElement>("[data-workflow-issue-row='true']");
    expect(row).not.toBeNull();
    if (row === null) return;

    fireEvent.contextMenu(row);

    expect(itemIds).toEqual(["issue.cancel", "issue.delete"]);
    expect(screen.getByRole("checkbox", { name: "Deselect Build the Project list" }))
      .toBeChecked();

    expect(invokeCancel).toBeDefined();
    await invokeCancel?.();
    expect(issueActions.changeStatus).toHaveBeenCalledTimes(1);
    expect(issueActions.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "issue-started" }),
      "issue-canceled",
    );
  });

  it("guards context-menu Delete behind the shared confirmation", () => {
    const { store } = readyStore();
    const issueActions = actions();
    let invokeDelete: (() => void | Promise<void>) | undefined;
    const presenter: TrailActionMenuPresenter = {
      showAtMouseEvent<TActionId extends string>(
        _event: MouseEvent,
        request: TrailActionMenuRequest<TActionId>,
      ): void {
        const deleteAction = request.items.find(({ id }) => id === "issue.delete");
        invokeDelete = deleteAction === undefined
          ? undefined
          : () => request.onSelect(deleteAction.id);
      },
      showAtPosition(): void {
        // This consumer proves context-menu destructive handoff only.
      },
    };

    render(
      <TrailActionMenuProvider presenter={presenter}>
        <TrailProjectWorkspacePage
          actions={issueActions}
          onInitiativeActivate={vi.fn()}
          onProjectsActivate={vi.fn()}
          projectId="project-a"
          renderMarkdown={renderMarkdown}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    const row = screen.getByText("Build the Project list")
      .closest<HTMLElement>("[data-workflow-issue-row='true']");
    expect(row).not.toBeNull();
    if (row === null) return;
    fireEvent.contextMenu(row);
    expect(invokeDelete).toBeDefined();
    act(() => {
      void invokeDelete?.();
    });

    expect(screen.getByRole("dialog")).toHaveTextContent("Delete issue?");
    expect(screen.getByRole("dialog"))
      .toHaveTextContent("Delete “Build the Project list” from Trail?");
    expect(issueActions.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(issueActions.delete).not.toHaveBeenCalled();
  });

  it("restores row focus after canceling selected context-menu Delete so the next Escape clears selection", async () => {
    const { store } = readyStore();
    let invokeDelete: (() => void | Promise<void>) | undefined;
    const presenter: TrailActionMenuPresenter = {
      showAtMouseEvent<TActionId extends string>(
        _event: MouseEvent,
        request: TrailActionMenuRequest<TActionId>,
      ): void {
        const deleteAction = request.items.find(({ id }) => id === "issue.delete");
        invokeDelete = deleteAction === undefined
          ? undefined
          : () => request.onSelect(deleteAction.id);
      },
      showAtPosition(): void {
        // This consumer proves selected context-menu focus restoration only.
      },
    };

    render(
      <TrailActionMenuProvider presenter={presenter}>
        <TrailProjectWorkspacePage
          actions={actions()}
          onInitiativeActivate={vi.fn()}
          onProjectsActivate={vi.fn()}
          projectId="project-a"
          renderMarkdown={renderMarkdown}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Build the Project list" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Close the previous slice" }));
    const selectedRow = screen.getByText("Build the Project list")
      .closest<HTMLElement>("[data-workflow-issue-row='true']");
    expect(selectedRow).not.toBeNull();
    if (selectedRow === null) return;

    fireEvent.contextMenu(selectedRow);
    expect(invokeDelete).toBeDefined();
    act(() => {
      void invokeDelete?.();
    });

    const dialog = screen.getByRole("dialog", { name: "Delete 2 issues?" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete 2 issues?" })).not.toBeInTheDocument();
      expect(selectedRow).toHaveFocus();
    });
    expect(screen.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("2 selected");

    fireEvent.keyDown(selectedRow, { key: "Escape" });

    expect(screen.queryByRole("toolbar", { name: "Selection actions" }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Build the Project list" }))
      .not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Close the previous slice" }))
      .not.toBeChecked();
  });

  it("uses one Registry context for Bulk Bar actions, destructive confirmation, and clear", async () => {
    const { store } = readyStore();
    const issueActions = actions();
    let overflowIds: readonly string[] = [];
    let invokeDelete: (() => void | Promise<void>) | undefined;
    const presenter: TrailActionMenuPresenter = {
      showAtMouseEvent(): void {
        // This consumer proves the Bulk Bar path only.
      },
      showAtPosition<TActionId extends string>(
        _position: TrailActionMenuPosition,
        request: TrailActionMenuRequest<TActionId>,
      ): void {
        overflowIds = request.items.map(({ id }) => id);
        const deleteAction = request.items.find(({ id }) => id === "issue.delete");
        invokeDelete = deleteAction === undefined
          ? undefined
          : () => request.onSelect(deleteAction.id);
      },
    };

    render(
      <TrailActionMenuProvider presenter={presenter}>
        <TrailProjectWorkspacePage
          actions={issueActions}
          onInitiativeActivate={vi.fn()}
          onProjectsActivate={vi.fn()}
          projectId="project-a"
          renderMarkdown={renderMarkdown}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Build the Project list" }));
    expect(screen.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("1 selected");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(issueActions.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "issue-started" }),
      "issue-canceled",
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Close the previous slice" }));
    expect(screen.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("2 selected");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More selection actions" }));
    expect(overflowIds).toEqual(["issue.delete"]);
    expect(invokeDelete).toBeDefined();
    act(() => {
      void invokeDelete?.();
    });

    expect(screen.getByRole("dialog")).toHaveTextContent("Delete 2 issues?");
    expect(issueActions.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(issueActions.delete).toHaveBeenCalledTimes(2));
    expect(issueActions.delete.mock.calls.map(([issue]) => issue.id))
      .toEqual(["issue-started", "issue-done"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByRole("toolbar", { name: "Selection actions" }))
      .not.toBeInTheDocument();
  });

  it("creates through the standard Issue Composer with the current Project as clean editable prefill", async () => {
    const { store } = readyStore();
    const issueActions = actions();
    render(
      <TrailProjectWorkspacePage
        actions={issueActions}
        onInitiativeActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add issue" }));
    expect(screen.getByRole("dialog", { name: "Issue · Project A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project: Project A" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Issue title" }), {
      target: { value: "New scoped issue" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(issueActions.createFromDraft).toHaveBeenCalledTimes(1));
    expect(issueActions.createFromDraft).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-a",
      title: "New scoped issue",
    }));
  });

  it("keeps the stable Add issue slot disabled for a terminal Project", () => {
    const { store } = readyStore("project-completed");
    render(
      <TrailProjectWorkspacePage
        actions={actions()}
        onInitiativeActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("button", { name: "Add issue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add issue" }))
      .toHaveAttribute("title", "Reopen this completed project before adding new work");
  });
});
