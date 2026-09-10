import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailProject,
  TrailWorkflowIssue,
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
import type { TrailMarkdownRender } from "../patterns/trail-markdown-content";
import { TrailApp } from "./trail-app";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

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
    description: "Full item body",
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Full Item route",
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
  return { issue, store };
}

function uiActions(): TrailUiActions {
  return {
    issues: {
      editProperties: vi.fn((expectedIssue: TrailWorkflowIssue) => ({
        entityId: expectedIssue.id,
        kind: "unchanged" as const,
      })),
    },
  } as unknown as TrailUiActions;
}

describe("TrailApp Issue route", () => {
  it("mounts Issue Full Item on the shared Main View surface and keeps ancestry navigation host-owned", () => {
    const { issue, store } = readyStore();
    const navigationStore = createTrailNavigationStore({
      issueId: issue.id,
      kind: "issue",
    });
    const onNavigate = vi.fn();

    const { container } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Issue title" }))
      .toHaveValue("Full Item route");
    expect(screen.queryByText("This page has not been implemented yet."))
      .not.toBeInTheDocument();
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-scroll", "nested");

    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "project", projectId: "project-a" });
    expect(navigationStore.getState().location).toEqual({ issueId: "issue-a", kind: "issue" });
  });
});
