import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import type { TrailMarkdownRender } from "../patterns/trail-page-narrative";
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

function uiActions(): TrailUiActions {
  return {
    issues: {
      createFromDraft: vi.fn(),
    },
    projects: {
      delete: vi.fn(),
    },
  } as unknown as TrailUiActions;
}

describe("TrailApp Project Workspace wiring", () => {
  it("mounts the real Project Workspace and emits breadcrumb navigation through the host callback", () => {
    const navigationStore = createTrailNavigationStore({ kind: "project", projectId: "project-a" });
    const onNavigate = vi.fn();
    const { container } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Project A" })).toBeInTheDocument();
    expect(screen.queryByText("This page has not been implemented yet.")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-inset", "none");
    expect(container.querySelector(".trail-page-surface")).toHaveAttribute("data-scroll", "nested");

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "projects" });
    expect(navigationStore.getState().location).toEqual({ kind: "project", projectId: "project-a" });
  });
});
