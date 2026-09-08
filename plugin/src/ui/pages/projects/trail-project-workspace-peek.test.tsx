import {
  fireEvent,
  render,
  screen,
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
    createFromDraft: vi.fn(() => ({
      commandId: "command-create",
      completion: Promise.resolve(),
      entityId: "new-issue",
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
});
