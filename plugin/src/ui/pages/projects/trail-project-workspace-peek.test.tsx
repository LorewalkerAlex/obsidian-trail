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
import type {
  TrailActionMenuPosition,
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../../interactions/trail-action-menu";
import { TrailActionMenuProvider } from "../../interactions/trail-action-menu-context";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { TrailProjectWorkspacePage } from "./trail-project-workspace-page";

const NOW = Date.UTC(2026, 8, 12, 9);

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = `Rendered: ${markdown}`;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore() {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Interaction pass",
  };
  const issues: TrailWorkflowIssue[] = [
    {
      context: "workflow",
      createdAt: NOW - 10_000,
      description: "Inspect this issue without leaving the Project collection.",
      due: NOW + 86_400_000,
      estimate: "large",
      id: "issue-started",
      labelIds: ["label-work"],
      milestoneId: milestone.id,
      priority: "high",
      projectId: project.id,
      statusDefinitionId: "issue-started",
      title: "Build Issue Peek",
    },
    {
      context: "workflow",
      createdAt: NOW,
      description: "A second visible issue for adjacent retargeting.",
      estimate: "small",
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
    sources: [{
      issues,
      kind: "project",
      milestones: [milestone],
      project,
      sourcePath: "Trail/Projects/0001 Project A.md",
    }],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

function actions() {
  return {
    changeStatus: vi.fn(() => ({
      entityId: "issue-started",
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
    moveToProject: vi.fn(() => ({
      entityId: "issue-started",
      kind: "unchanged" as const,
    })),
  };
}

describe("Project Workspace Issue Peek", () => {
  it("opens from ordinary row activation, retargets through visible order, and closes without navigation", async () => {
    const store = readyStore();
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

    fireEvent.click(screen.getByText("Build Issue Peek"));
    const firstPeek = screen.getByRole("complementary", { name: "Issue peek: Build Issue Peek" });
    expect(firstPeek).toBeInTheDocument();
    expect(await within(firstPeek).findByText(
      "Rendered: Inspect this issue without leaving the Project collection.",
    )).toBeInTheDocument();
    expect(within(firstPeek).queryByLabelText("Project: Project A")).not.toBeInTheDocument();
    expect(within(firstPeek).queryByText("Properties")).not.toBeInTheDocument();
    expect(container.querySelector("[data-workflow-issue-row='true'][data-highlighted='true']"))
      .toHaveTextContent("Build Issue Peek");


    const page = container.querySelector<HTMLElement>(".trail-project-workspace-page");
    expect(page).not.toBeNull();
    if (page === null) return;
    fireEvent.keyDown(page, { key: "ArrowDown" });
    expect(screen.getByRole("complementary", { name: "Issue peek: Close the previous slice" }))
      .toBeInTheDocument();
    expect(container.querySelector("[data-workflow-issue-row='true'][data-highlighted='true']"))
      .toHaveTextContent("Close the previous slice");
    expect(document.activeElement).toHaveTextContent("Close the previous slice");

    fireEvent.keyDown(page, { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: /Issue peek:/ })).not.toBeInTheDocument();
    expect(screen.getByText("Build Issue Peek")).toBeInTheDocument();
    expect(screen.getByText("Close the previous slice")).toBeInTheDocument();
  });

  it("treats unrelated Page interaction as Peek dismissal while another Issue row retargets it", () => {
    const store = readyStore();
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

    fireEvent.click(screen.getByText("Build Issue Peek"));
    fireEvent.click(screen.getByText("Close the previous slice"));
    expect(screen.getByRole("complementary", { name: "Issue peek: Close the previous slice" }))
      .toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("complementary", { name: /Issue peek:/ })).not.toBeInTheDocument();
  });

  it("keeps Peek overflow entity-local and lets confirmation own transient dismissal", async () => {
    const store = readyStore();
    let itemIds: readonly string[] = [];
    let invokeDelete: (() => void | Promise<void>) | undefined;
    const presenter: TrailActionMenuPresenter = {
      showAtMouseEvent(): void {
        // This consumer proves the explicit Peek overflow path only.
      },
      showAtPosition<TActionId extends string>(
        _position: TrailActionMenuPosition,
        request: TrailActionMenuRequest<TActionId>,
      ): void {
        itemIds = request.items.map(({ id }) => id);
        const deleteAction = request.items.find(({ id }) => id === "issue.delete");
        invokeDelete = deleteAction === undefined
          ? undefined
          : () => request.onSelect(deleteAction.id);
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

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Build Issue Peek" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Close the previous slice" }));
    fireEvent.click(screen.getByText("Build Issue Peek"));

    fireEvent.click(screen.getByRole("button", { name: "More issue actions" }));

    expect(itemIds).toEqual(["issue.cancel", "issue.delete"]);
    expect(screen.getByRole("checkbox", { name: "Deselect Build Issue Peek" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Deselect Close the previous slice" })).toBeChecked();

    expect(invokeDelete).toBeDefined();
    act(() => {
      void invokeDelete?.();
    });
    const dialog = screen.getByRole("dialog", { name: "Delete issue?" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete issue?" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("complementary", { name: "Issue peek: Build Issue Peek" }))
      .toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Deselect Build Issue Peek" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Deselect Close the previous slice" })).toBeChecked();
  });
});
