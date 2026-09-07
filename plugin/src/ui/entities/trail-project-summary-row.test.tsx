import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailProjectSummaryRow } from "./trail-project-summary-row";

const REFERENCE_DUE = Date.UTC(2026, 8, 18, 9);

describe("TrailProjectSummaryRow", () => {
  it("composes the compact Projects scanning hierarchy from explicit semantic props", () => {
    render(
      <TrailProjectSummaryRow
        due={REFERENCE_DUE}
        priority="high"
        progress={{ max: 12, value: 8 }}
        statusCategory="started"
        statusLabel="In Progress"
        timezone="UTC"
        title="Foundation visual system"
      />,
    );

    const row = screen.getByText("Foundation visual system").closest("[data-project-summary-row]");
    expect(row).toHaveClass("trail-collection-row");
    expect(screen.getByRole("img", { name: "In Progress status" }))
      .toHaveAttribute("data-status-category", "started");
    expect(screen.getByText("In Progress")).toHaveClass("trail-project-summary-row__status");
    expect(screen.getByRole("img", { name: "High priority" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Foundation visual system progress" }))
      .toHaveClass("trail-progress--micro");
    expect(screen.getByLabelText("September 18, 2026")).toBeInTheDocument();
  });

  it("keeps unavailable progress and missing Due explicit instead of fabricating values", () => {
    render(
      <TrailProjectSummaryRow
        priority={undefined}
        progress={{ unavailable: true }}
        statusCategory="unstarted"
        statusLabel="Planned"
        timezone="UTC"
        title="No execution evidence yet"
      />,
    );

    expect(screen.getByRole("progressbar", { name: "No execution evidence yet progress" }))
      .toHaveAttribute("aria-valuetext", "Unavailable");
    expect(screen.getByLabelText("No due date")).toHaveTextContent("—");
    expect(screen.getByRole("img", { name: "No priority" })).toBeInTheDocument();
  });

  it("derives reduced terminal presentation only from the resolved lifecycle category", () => {
    const { rerender } = render(
      <TrailProjectSummaryRow
        priority="low"
        progress={{ max: 4, value: 4 }}
        statusCategory="completed"
        statusLabel="Shipped"
        timezone="UTC"
        title="Completed project"
      />,
    );

    expect(screen.getByText("Completed project").closest("[data-project-summary-row]"))
      .toHaveAttribute("data-terminal", "true");

    rerender(
      <TrailProjectSummaryRow
        priority="low"
        progress={{ max: 4, value: 4 }}
        statusCategory="started"
        statusLabel="Active"
        timezone="UTC"
        title="Completed project"
      />,
    );

    expect(screen.getByText("Completed project").closest("[data-project-summary-row]"))
      .not.toHaveAttribute("data-terminal");
  });

  it("offers one explicit title activation target without double-firing row activation", () => {
    const onActivate = vi.fn();
    render(
      <TrailProjectSummaryRow
        onActivate={onActivate}
        priority="urgent"
        progress={{ max: 10, value: 3 }}
        statusCategory="started"
        statusLabel="In Progress"
        timezone="UTC"
        title="Interactive project"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Interactive project" }));
    expect(onActivate).toHaveBeenCalledOnce();
  });
});
