import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("Trail Home widget specimens", () => {
  it("keeps the Home widget family low-noise while preserving exact focus detail", async () => {
    const { container } = render(
      <TrailFoundationLab control={{ kind: "ready" }} revision={13} />,
    );

    const thisWeek = within(screen.getByRole("group", {
      name: "Home widget · This week · 1×1 typography candidate",
    }));

    expect(thisWeek.getByRole("region", { name: "This week" }))
      .toHaveAttribute("data-home-widget-size", "compact");
    expect(thisWeek.getByText("Sep")).toBeInTheDocument();
    expect(thisWeek.queryByText(/Sep 14/)).not.toBeInTheDocument();
    expect(thisWeek.getByText("Triage")).toBeInTheDocument();
    expect(thisWeek.getByText("Issues")).toBeInTheDocument();
    expect(thisWeek.queryByText("Today")).not.toBeInTheDocument();
    expect(thisWeek.queryByText("0")).not.toBeInTheDocument();
    expect(thisWeek.getAllByText("-")).toHaveLength(7);
    expect(container.querySelectorAll(".trail-home-this-week__count")).toHaveLength(14);
    expect(container.querySelectorAll('.trail-home-this-week__count[data-today="true"]')).toHaveLength(2);

    const lifecycle = within(screen.getByRole("group", {
      name: "Home widget · Lifecycle · full-row annual candidate",
    }));
    const lifecycleRegion = lifecycle.getByRole("region", { name: "Lifecycle activity" });

    expect(lifecycleRegion).toHaveAttribute("data-home-widget-size", "banner");
    expect(lifecycle.getByLabelText("Lifecycle activity calendar")).toBeInTheDocument();
    expect(lifecycle.getByText("Oct")).toBeInTheDocument();
    expect(lifecycle.getByText("Jan")).toBeInTheDocument();
    expect(lifecycle.getByText("Sep")).toBeInTheDocument();
    expect(lifecycle.getByText(/\d+ events/)).toBeInTheDocument();
    expect(lifecycle.queryByText("Less")).not.toBeInTheDocument();
    expect(lifecycle.queryByText("More")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".trail-home-lifecycle__cell")).toHaveLength(349);
    expect(container.querySelectorAll('.trail-home-lifecycle__cell[data-level="0"]')[0]).toBeDefined();
    expect(container.querySelectorAll('.trail-home-lifecycle__cell[data-level="1"]')[0]).toBeDefined();
    expect(container.querySelectorAll(".trail-home-lifecycle__cell[tabindex='0']")).toHaveLength(349);

    const workTrend = within(screen.getByRole("group", {
      name: "Home widget · Work trend · 2×1 candidate",
    }));
    const trendRegion = workTrend.getByRole("region", { name: "Work trend" });

    expect(trendRegion).toHaveAttribute("data-home-widget-size", "wide");
    expect(workTrend.getByRole("img", { name: "Work trend chart" })).toBeInTheDocument();
    expect(workTrend.getByText("Jul–Sep")).toBeInTheDocument();
    expect(workTrend.queryByText("Completed today")).not.toBeInTheDocument();
    expect(container.querySelectorAll('.trail-home-work-trend__area[data-series="backlog"]')).toHaveLength(1);
    expect(container.querySelectorAll('.trail-home-work-trend__area[data-series="active"]')).toHaveLength(1);
    expect(container.querySelectorAll('.trail-home-work-trend__area[data-series="completed"]')).toHaveLength(1);

    const focusDays = container.querySelectorAll<HTMLElement>(
      ".trail-home-work-trend__focus-day[tabindex='0']",
    );
    expect(focusDays).toHaveLength(76);
    expect(focusDays[0].textContent).toContain("Completed 7d");
    expect(focusDays[0]).not.toHaveAttribute("aria-label");

    fireEvent.focus(focusDays[0]);
    expect(within(trendRegion).getByText("Completed 7d")).toBeInTheDocument();
    expect(within(trendRegion).getByText("Backlog")).toBeInTheDocument();
    expect(within(trendRegion).getByText("Active")).toBeInTheDocument();

    const weeklyNotes = within(screen.getByRole("group", {
      name: "Home widget \u00b7 Weekly meeting notes \u00b7 2\u00d71 candidate",
    }));
    const weeklyRegion = weeklyNotes.getByRole("region", { name: "Weekly meeting notes" });

    expect(weeklyRegion).toHaveAttribute("data-home-widget-size", "wide");
    expect(await weeklyNotes.findByText(
      "Capture decisions, follow-ups, and open questions for the next weekly review.",
    )).toBeInTheDocument();
    fireEvent.click(weeklyNotes.getByRole("button", { name: "Edit" }));
    expect(weeklyNotes.getByRole("textbox", { name: "Current weekly meeting notes" }))
      .toBeInTheDocument();
    expect(weeklyNotes.queryByRole("button", { name: "Archive / next" }))
      .not.toBeInTheDocument();
    fireEvent.click(weeklyNotes.getByRole("button", { name: "Cancel" }));
    fireEvent.click(weeklyNotes.getByRole("button", { name: "History" }));
    expect(weeklyNotes.getByRole("button", { name: "2026-09-14" }))
      .toHaveAttribute("aria-pressed", "true");
  }, 30_000);
});
