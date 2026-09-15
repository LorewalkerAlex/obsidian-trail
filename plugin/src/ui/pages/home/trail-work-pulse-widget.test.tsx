import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailWorkPulseWidget } from "./trail-work-pulse-widget";

const AVAILABLE_PROGRESS = { max: 4, unavailable: false as const, value: 2 };
const UNAVAILABLE_PROGRESS = { unavailable: true as const };

function renderPulse(input: {
  readonly current?: boolean;
  readonly triageActive?: boolean;
} = {}) {
  const onCurrentCycleActivate = vi.fn();
  const onProjectActivate = vi.fn();
  const onProjectsActivate = vi.fn();
  const onStartCycle = vi.fn();
  const onTriageActivate = vi.fn();

  render(
    <TrailWorkPulseWidget
      currentCycle={input.current === false ? undefined : {
        id: "cycle-current",
        plannedEnd: Date.UTC(2026, 8, 20, 15, 59),
        progress: AVAILABLE_PROGRESS,
        startedAt: Date.UTC(2026, 8, 7, 16),
      }}
      onCurrentCycleActivate={onCurrentCycleActivate}
      onProjectActivate={onProjectActivate}
      onProjectsActivate={onProjectsActivate}
      onStartCycle={onStartCycle}
      onTriageActivate={onTriageActivate}
      projects={[
        { id: "project-a", progress: AVAILABLE_PROGRESS, title: "Project Alpha" },
        { id: "project-b", progress: UNAVAILABLE_PROGRESS, title: "Project Beta" },
        { id: "project-c", progress: AVAILABLE_PROGRESS, title: "Project Gamma" },
        { id: "project-d", progress: AVAILABLE_PROGRESS, title: "Project Delta" },
      ]}
      timezone="Asia/Singapore"
      triage={input.triageActive === false
        ? { activeCount: 0, overdueCount: 0, remainCount: 0 }
        : { activeCount: 7, overdueCount: 2, remainCount: 5 }}
    />,
  );

  return {
    onCurrentCycleActivate,
    onProjectActivate,
    onProjectsActivate,
    onStartCycle,
    onTriageActivate,
  };
}

describe("TrailWorkPulseWidget", () => {
  it("makes the Cycle, Triage, and visible Project summaries route from their full hit areas", () => {
    const callbacks = renderPulse();
    const region = screen.getByRole("region", { name: "Work pulse" });

    expect(region).toHaveAttribute("data-home-widget-size", "banner");
    expect(within(region).getByText("Sep 8 – Sep 20")).toBeInTheDocument();
    expect(within(region).getByText("2 / 4 done")).toBeInTheDocument();
    expect(within(region).getByRole("progressbar", { name: "Current cycle progress" }))
      .toHaveClass("trail-progress--compact");
    expect(within(region).getByLabelText("overdue: 2")).toBeInTheDocument();
    expect(within(region).getByLabelText("remain: 5")).toBeInTheDocument();
    expect(region.querySelector(".trail-segmented-summary--inline")).toBeInTheDocument();
    expect(within(region).getByText("Project Alpha")).toBeInTheDocument();
    expect(within(region).getByText("Project Gamma")).toBeInTheDocument();
    expect(within(region).queryByText("Project Delta")).not.toBeInTheDocument();
    expect(within(region).getByText("+1 more")).toBeInTheDocument();

    const cycleRoute = within(region).getByRole("button", { name: "Open current cycle" });
    expect(cycleRoute).toContainElement(within(region).getByText("Current cycle"));
    expect(cycleRoute).toContainElement(within(region).getByText("Sep 8 – Sep 20"));

    const triageRoute = within(region).getByRole("button", { name: "Open Triage" });
    expect(triageRoute).toContainElement(within(region).getByText("Triage"));
    expect(triageRoute).toContainElement(within(region).getByRole("group", { name: "Triage pressure" }));

    const projectAlpha = within(region).getByRole("button", { name: "Open Project Alpha" });
    expect(within(projectAlpha).getByRole("progressbar", { name: "Project Alpha progress" }))
      .toHaveClass("trail-progress--micro");
    expect(within(projectAlpha).getByText("50%")).toBeInTheDocument();

    const projectBeta = within(region).getByRole("button", { name: "Open Project Beta" });
    expect(within(projectBeta).getByText("—")).toBeInTheDocument();

    fireEvent.click(within(cycleRoute).getByText("Current cycle"));
    fireEvent.click(within(triageRoute).getByText("Triage"));
    fireEvent.click(within(projectAlpha).getByText("Project Alpha"));
    fireEvent.click(within(region).getByRole("button", { name: "Open Projects" }));

    expect(callbacks.onCurrentCycleActivate).toHaveBeenCalledWith("cycle-current");
    expect(callbacks.onTriageActivate).toHaveBeenCalledTimes(1);
    expect(callbacks.onProjectActivate).toHaveBeenCalledWith("project-a");
    expect(callbacks.onProjectsActivate).toHaveBeenCalledTimes(1);
  });

  it("uses the standard Start Cycle entry and keeps zero-Triage routing on the full module", () => {
    const callbacks = renderPulse({ current: false, triageActive: false });
    const region = screen.getByRole("region", { name: "Work pulse" });

    expect(within(region).getByText("No current cycle")).toBeInTheDocument();
    const triageRoute = within(region).getByRole("button", { name: "Open Triage" });
    expect(triageRoute).toHaveTextContent("0 active");

    fireEvent.click(within(region).getByRole("button", { name: "Start cycle" }));
    fireEvent.click(within(triageRoute).getByText("Triage"));

    expect(callbacks.onStartCycle).toHaveBeenCalledTimes(1);
    expect(callbacks.onTriageActivate).toHaveBeenCalledTimes(1);
  });
});
