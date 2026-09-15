import { fireEvent, render, screen, within } from "@testing-library/react";
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

function homeActions(): {
  readonly cycles: Pick<TrailUiActions["cycles"], "start">;
  readonly weeklyNote: TrailUiActions["weeklyNote"];
} {
  const start: TrailUiActions["cycles"]["start"] = () => {
    throw new Error("Cycle start submission is not expected in this test");
  };
  return {
    cycles: { start },
    weeklyNote: {
      archiveCurrent: vi.fn(async () => ({ archives: [], current: "" })),
      load: vi.fn(async () => ({ archives: [], current: "Weekly planning notes" })),
      replaceCurrent: vi.fn(async (_expectedCurrent: string, current: string) => ({ archives: [], current })),
    },
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
        actions={homeActions()}
        onCycleActivate={vi.fn()}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        onTriageActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "This week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Weekly meeting notes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Work pulse" })).not.toBeInTheDocument();
  });

  it("consumes temporal, Weekly Notes, and Work Pulse production modules", async () => {
    const onCycleActivate = vi.fn();
    const onProjectsActivate = vi.fn();
    const onTriageActivate = vi.fn();
    const { container } = render(
      <TrailHomePage
        actions={homeActions()}
        onCycleActivate={onCycleActivate}
        onProjectActivate={vi.fn()}
        onProjectsActivate={onProjectsActivate}
        onTriageActivate={onTriageActivate}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    const thisWeek = screen.getByRole("region", { name: "This week" });
    const lifecycle = screen.getByRole("region", { name: "Lifecycle activity" });
    const workTrend = screen.getByRole("region", { name: "Work trend" });
    const weeklyNotes = screen.getByRole("region", { name: "Weekly meeting notes" });
    const workPulse = screen.getByRole("region", { name: "Work pulse" });

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(thisWeek).toHaveAttribute("data-home-widget-size", "compact");
    expect(lifecycle).toHaveAttribute("data-home-widget-size", "banner");
    expect(workTrend).toHaveAttribute("data-home-widget-size", "wide");
    expect(weeklyNotes).toHaveAttribute("data-home-widget-size", "wide");
    expect(workPulse).toHaveAttribute("data-home-widget-size", "banner");
    expect(within(thisWeek).getByText("Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("Jul\u2013Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("No workflow history yet")).toBeInTheDocument();
    expect(await within(weeklyNotes).findByText("Weekly planning notes")).toBeInTheDocument();
    expect(within(workPulse).getByText("0 active")).toBeInTheDocument();
    expect(within(workPulse).getByText("None started")).toBeInTheDocument();

    fireEvent.click(within(workPulse).getByRole("button", { name: "Open Triage" }));
    fireEvent.click(within(workPulse).getByRole("button", { name: "Open Projects" }));
    expect(onTriageActivate).toHaveBeenCalledTimes(1);
    expect(onProjectsActivate).toHaveBeenCalledTimes(1);

    fireEvent.click(within(workPulse).getByRole("button", { name: "Start cycle" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start cycle" })).toBeInTheDocument();
    expect(onCycleActivate).not.toHaveBeenCalled();

    const slots = Array.from(container.querySelectorAll<HTMLElement>(".trail-home-page__slot"))
      .map((slot) => slot.dataset.homeSlot);
    expect(slots).toEqual([
      "this-week",
      "work-pulse",
      "lifecycle",
      "work-trend",
      "weekly-notes",
    ]);
  });
});
