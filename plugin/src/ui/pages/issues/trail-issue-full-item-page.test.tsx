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
import type { TrailMarkdownRender } from "../../patterns/trail-markdown-content";
import { TrailIssueFullItemPage } from "./trail-issue-full-item-page";

vi.mock("./trail-issue-body-editor", () => ({
  TrailIssueBodyEditor: ({
    onCommit,
  }: {
    readonly onCommit: (value: string) => void;
  }) => (
    <button onClick={() => onCommit("Edited **body**")} type="button">
      Commit body edit
    </button>
  ),
}));

const NOW = Date.UTC(2026, 8, 12, 9);

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = `Rendered: ${markdown}`;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function readyStore(projectStatusDefinitionId = "project-started") {
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: projectStatusDefinitionId,
    title: "Project A",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: NOW - 10_000,
    description: "Body with **Markdown**",
    due: NOW + 86_400_000,
    estimate: "large",
    id: "issue-a",
    labelIds: ["label-work"],
    priority: "high",
    projectId: project.id,
    statusDefinitionId: "issue-started",
    title: "Original issue title",
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

  return { issue, project, store };
}

function unchangedEdit(expectedIssue: TrailWorkflowIssue) {
  return { entityId: expectedIssue.id, kind: "unchanged" as const };
}

describe("TrailIssueFullItemPage", () => {
  it("renders the deep-edit document surface and saves inline title edits through Issue Application", async () => {
    const { issue, store } = readyStore();
    const editProperties = vi.fn(unchangedEdit);
    const onProjectActivate = vi.fn();
    const onProjectsActivate = vi.fn();

    render(
      <TrailIssueFullItemPage
        actions={{ editProperties }}
        issueId={issue.id}
        onProjectActivate={onProjectActivate}
        onProjectsActivate={onProjectsActivate}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Issue ancestry" })).toHaveTextContent(
      "Projects/Project A",
    );
    expect(await screen.findByText("Rendered: Body with **Markdown**")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(onProjectsActivate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-a");

    const title = screen.getByRole("textbox", { name: "Issue title" });
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "Edited issue title" } });
    fireEvent.blur(title);

    await waitFor(() => expect(editProperties).toHaveBeenCalledTimes(1));
    expect(editProperties).toHaveBeenNthCalledWith(1, issue, {
      description: issue.description,
      due: issue.due,
      estimate: issue.estimate,
      labelIds: issue.labelIds,
      priority: issue.priority,
      title: "Edited issue title",
    });

    fireEvent.click(screen.getByLabelText("Edit issue description"));
    fireEvent.click(screen.getByRole("button", { name: "Commit body edit" }));

    await waitFor(() => expect(editProperties).toHaveBeenCalledTimes(2));
    expect(editProperties).toHaveBeenNthCalledWith(2, issue, {
      description: "Edited **body**",
      due: issue.due,
      estimate: issue.estimate,
      labelIds: issue.labelIds,
      priority: issue.priority,
      title: issue.title,
    });
  });

  it("leaves rendered Markdown links in the Obsidian render path instead of converting link activation into edit", () => {
    const { issue, store } = readyStore();
    const renderLinkedMarkdown: TrailMarkdownRender = (_markdown, container) => {
      const link = container.ownerDocument.createElement("a");
      link.href = "#linked-note";
      link.textContent = "Linked note";
      container.replaceChildren(link);
      return {
        completion: Promise.resolve(),
        dispose: () => container.replaceChildren(),
      };
    };

    render(
      <TrailIssueFullItemPage
        actions={{ editProperties: vi.fn(unchangedEdit) }}
        issueId={issue.id}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        renderMarkdown={renderLinkedMarkdown}
        runtimeStore={store}
      />,
    );

    const link = screen.getByRole("link", { name: "Linked note" });
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: "Enter" });

    expect(link).toHaveAttribute("href", "#linked-note");
    expect(screen.queryByRole("button", { name: "Commit body edit" }))
      .not.toBeInTheDocument();
  });

  it("rebases one-field commits on the latest readable Issue so unrelated property changes are preserved", async () => {
    const { issue, project, store } = readyStore();
    const editProperties = vi.fn(unchangedEdit);

    render(
      <TrailIssueFullItemPage
        actions={{ editProperties }}
        issueId={issue.id}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    const title = screen.getByRole("textbox", { name: "Issue title" });
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "Title after Inspector-style change" } });

    const latestIssue: TrailWorkflowIssue = { ...issue, priority: "urgent" };
    act(() => {
      publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
        pluginData: {
          configuration: createTrailTestConfiguration(),
          workspaceState: createTrailTestWorkspaceState(project.id),
        },
        sources: [{
          issues: [latestIssue],
          kind: "project",
          milestones: [],
          project,
          sourcePath: "Trail/Projects/0001 Project A.md",
        }],
      }), { sourceIssuesByPath: {} });
    });

    fireEvent.blur(title);

    await waitFor(() => expect(editProperties).toHaveBeenCalledTimes(1));
    expect(editProperties).toHaveBeenCalledWith(latestIssue, {
      description: latestIssue.description,
      due: latestIssue.due,
      estimate: latestIssue.estimate,
      labelIds: latestIssue.labelIds,
      priority: "urgent",
      title: "Title after Inspector-style change",
    });
  });

  it("keeps terminal-Project Full Item readable without exposing title/body edit affordances", async () => {
    const { issue, store } = readyStore("project-canceled");
    const editProperties = vi.fn(unchangedEdit);

    render(
      <TrailIssueFullItemPage
        actions={{ editProperties }}
        issueId={issue.id}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Original issue title" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Issue title" })).not.toBeInTheDocument();
    expect(await screen.findByText("Rendered: Body with **Markdown**")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit issue description")).not.toBeInTheDocument();
    expect(editProperties).not.toHaveBeenCalled();
  });
});
