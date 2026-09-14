import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("Trail Home widget specimens", () => {
  it("keeps This week compact and studies Lifecycle as a full-row annual calendar", () => {
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
      name: "Home widget · Work trend · size study",
    }));
    const trendRegions = workTrend.getAllByRole("region", { name: "Work trend" });

    expect(trendRegions).toHaveLength(2);
    expect(trendRegions[0]).toHaveAttribute("data-home-widget-size", "wide");
    expect(trendRegions[1]).toHaveAttribute("data-home-widget-size", "large");
    expect(workTrend.getAllByRole("img", { name: "Work trend chart" })).toHaveLength(2);
    expect(workTrend.getAllByText("Jul–Sep")).toHaveLength(2);
    expect(workTrend.getAllByText("Backlog")).toHaveLength(2);
    expect(workTrend.getAllByText("Active")).toHaveLength(2);
    expect(workTrend.getAllByText("Completed today")).toHaveLength(2);
    expect(container.querySelectorAll(".trail-home-work-trend__focus-day[tabindex='0']")).toHaveLength(152);
  }, 30_000);
});
