import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
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

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore() {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-started",
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: Date.UTC(2026, 8, 10, 9),
    description: "Open the deep editing surface.",
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Open Full Item",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [{
      issues: [issue],
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

describe("Project Workspace Full Item navigation", () => {
  it("keeps row activation as Peek and emits stable Page navigation only from Open full item", () => {
    const onIssueActivate = vi.fn();

    render(
      <TrailProjectWorkspacePage
        actions={actions()}
        onInitiativeActivate={vi.fn()}
        onIssueActivate={onIssueActivate}
        onProjectsActivate={vi.fn()}
        projectId="project-a"
        renderMarkdown={renderMarkdown}
        runtimeStore={readyStore()}
      />,
    );

    fireEvent.click(screen.getByText("Open Full Item"));
    expect(screen.getByRole("complementary", { name: "Issue peek: Open Full Item" }))
      .toBeInTheDocument();
    expect(onIssueActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open full item" }));
    expect(onIssueActivate).toHaveBeenCalledWith("issue-a");
  });
});
