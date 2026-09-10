import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailWorkflowIssuePresentationReadModel } from "../../query/shared/trail-workflow-issue-presentation-query";
import type { TrailMarkdownRender } from "./trail-markdown-content";
import { TrailIssuePeek } from "./trail-issue-peek";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = `Rendered: ${markdown}`;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

const issue: TrailWorkflowIssuePresentationReadModel = {
  description: "Full **read-only** body",
  due: Date.UTC(2026, 8, 18, 9),
  estimate: "large",
  id: "issue-a",
  inCurrentCycle: true,
  labels: [{ groupId: "group-a", id: "label-a", name: "Design" }],
  milestone: { id: "milestone-a", title: "Interaction pass" },
  priority: "high",
  project: { id: "project-a", title: "Project A" },
  status: {
    category: "started",
    id: "issue-started",
    label: "In Progress",
  },
  title: "Build Issue Peek",
};

describe("TrailIssuePeek", () => {
  it("renders read-only Issue detail without turning the surface into an editor", async () => {
      const { container } = render(
      <TrailIssuePeek
        issue={issue}
        renderMarkdown={renderMarkdown}
        timezone="UTC"
      />,
    );

    expect(screen.getByRole("complementary", { name: "Issue peek: Build Issue Peek" }))
      .toBeInTheDocument();
    expect(await screen.findByText("Rendered: Full **read-only** body")).toBeInTheDocument();
    const metadata = screen.getByRole("group", { name: "Issue metadata" });
    expect(metadata).toBeInTheDocument();
    expect(screen.getByLabelText("Status: In Progress")).toHaveTextContent("In Progress");
    expect(screen.getByLabelText("Priority: High")).toHaveTextContent("High");
    expect(screen.getByLabelText("Project: Project A")).toHaveTextContent("Project A");
    expect(screen.getByLabelText("Milestone: Interaction pass")).toHaveTextContent("Interaction pass");
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(screen.getByText("Current cycle")).toBeInTheDocument();
    expect(screen.queryByText("Properties")).not.toBeInTheDocument();
    expect(container.querySelector("input, textarea, select, [contenteditable='true']"))
      .toBeNull();

  });

  it("emits Full Item navigation when the consuming collection supplies it", () => {
    const onOpenFullItem = vi.fn();

    render(
      <TrailIssuePeek
        issue={issue}
        onOpenFullItem={onOpenFullItem}
        renderMarkdown={renderMarkdown}
        timezone="UTC"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open full item" }));
    expect(onOpenFullItem).toHaveBeenCalledTimes(1);
  });
});
