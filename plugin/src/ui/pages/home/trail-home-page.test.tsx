import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { createTrailTestRuntimeStore } from "../../../test/trail-runtime-test-harness";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailHomePage } from "./trail-home-page";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function weeklyNoteActions(): TrailUiActions["weeklyNote"] {
  return {
    archiveCurrent: vi.fn(async () => ({ archives: [], current: "" })),
    load: vi.fn(async () => ({ archives: [], current: "Weekly planning notes" })),
    replaceCurrent: vi.fn(async (_expectedCurrent: string, current: string) => ({ archives: [], current })),
  };
}

describe("TrailHomePage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 14, 8));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Page identity available before Configuration is readable", () => {
    render(
      <TrailHomePage
        actions={weeklyNoteActions()}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "This week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Weekly meeting notes" })).not.toBeInTheDocument();
  });

  it("consumes the temporal and Weekly Meeting Notes production modules", async () => {
    const { container } = render(
      <TrailHomePage
        actions={weeklyNoteActions()}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    const thisWeek = screen.getByRole("region", { name: "This week" });
    const lifecycle = screen.getByRole("region", { name: "Lifecycle activity" });
    const workTrend = screen.getByRole("region", { name: "Work trend" });
    const weeklyNotes = screen.getByRole("region", { name: "Weekly meeting notes" });

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(thisWeek).toHaveAttribute("data-home-widget-size", "compact");
    expect(lifecycle).toHaveAttribute("data-home-widget-size", "banner");
    expect(workTrend).toHaveAttribute("data-home-widget-size", "wide");
    expect(weeklyNotes).toHaveAttribute("data-home-widget-size", "wide");
    expect(within(thisWeek).getByText("Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("Jul\u2013Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("No workflow history yet")).toBeInTheDocument();
    expect(await within(weeklyNotes).findByText("Weekly planning notes")).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="this-week"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="lifecycle"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="work-trend"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="weekly-notes"]')).toBeInTheDocument();
  });
});
