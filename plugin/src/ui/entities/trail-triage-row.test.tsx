import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailTriageRow } from "./trail-triage-row";

describe("TrailTriageRow", () => {
  it("composes Triage scanning identity over the shared collection row", () => {
    render(
      <TrailTriageRow
        labels={<span>Design</span>}
        priority="high"
        reviewDue={<time dateTime="2026-09-03">Sep 3</time>}
        title="Refine intake flow"
      />,
    );

    const row = screen.getByText("Refine intake flow").closest("[data-triage-row]");

    expect(row).toHaveClass("trail-collection-row");
    expect(row).toHaveAttribute("data-triage-row", "true");
    expect(screen.getByRole("img", { name: "High priority" })).toBeInTheDocument();
    expect(screen.getByTitle("High")).toHaveClass("trail-triage-row__priority");
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Sep 3")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps selection activation separate from ordinary row activation", () => {
    const onActivate = vi.fn();
    const onSelectedChange = vi.fn();

    render(
      <TrailTriageRow
        onActivate={onActivate}
        onSelectedChange={onSelectedChange}
        priority={undefined}
        reviewDue="Tomorrow"
        title="Capture follow-up"
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Capture follow-up" });
    fireEvent.click(checkbox);

    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(onActivate).not.toHaveBeenCalled();

    const row = screen.getByRole("button", { name: "Capture follow-up" })
      .closest("[data-triage-row]");
    if (row === null) throw new Error("Expected Triage row");
    fireEvent.click(row);
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("does not route the row when an inline property control is activated", () => {
    const onActivate = vi.fn();
    const onLabelClick = vi.fn();

    render(
      <TrailTriageRow
        labels={<button onClick={onLabelClick} type="button">Design</button>}
        onActivate={onActivate}
        priority="medium"
        reviewDue="Friday"
        title="Keep inline edits local"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Design" }));

    expect(onLabelClick).toHaveBeenCalledOnce();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("gives the title an explicit keyboard activation target without double activation", () => {
    const onActivate = vi.fn();

    render(
      <TrailTriageRow
        onActivate={onActivate}
        priority="urgent"
        reviewDue="Today"
        title="Review urgent capture"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review urgent capture" }));
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it("keeps the title read-only when the consumer supplies no activation", () => {
    render(
      <TrailTriageRow
        priority="low"
        reviewDue="Next week"
        title="Passive specimen"
      />,
    );

    expect(screen.queryByRole("button", { name: "Passive specimen" })).not.toBeInTheDocument();
    expect(screen.getByText("Passive specimen")).toHaveClass("trail-triage-row__title");
  });
});
