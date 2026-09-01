import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  getTrailPriorityPresentation,
  TRAIL_PRIORITY_PRESENTATION_VALUES,
  TrailPriorityGlyph,
} from "./trail-priority";
import { TrailPriorityPropertySelect } from "./trail-priority-property-select";

describe("Trail priority presentation", () => {
  it("maps canonical priorities and absence to one stable user-facing identity", () => {
    expect(
      TRAIL_PRIORITY_PRESENTATION_VALUES.map((priority) => ({
        label: getTrailPriorityPresentation(priority).label,
        priority,
      })),
    ).toEqual([
      { label: "No priority", priority: undefined },
      { label: "Urgent", priority: "urgent" },
      { label: "High", priority: "high" },
      { label: "Medium", priority: "medium" },
      { label: "Low", priority: "low" },
    ]);
  });

  it("keeps glyph accessibility tied to the same semantic identity", () => {
    const { rerender } = render(<TrailPriorityGlyph priority="high" />);

    expect(screen.getByRole("img", { name: "High priority" })).toHaveAttribute(
      "data-priority",
      "high",
    );

    rerender(<TrailPriorityGlyph priority={undefined} />);

    expect(screen.getByRole("img", { name: "No priority" })).toHaveAttribute(
      "data-priority",
      "none",
    );
  });

  it("can be decorative when surrounding content already names the value", () => {
    const { container } = render(
      <span>
        <TrailPriorityGlyph decorative priority="urgent" />
        Urgent
      </span>,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-priority-glyph")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("TrailPriorityPropertySelect", () => {
  it("composes the semantic value into the existing PropertyControl trigger", () => {
    render(
      <TrailPriorityPropertySelect
        onValueChange={vi.fn()}
        value="high"
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Priority: High" });

    expect(trigger).toHaveClass("trail-property-control");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("High");
  });

  it("presents absence without promoting it into the Domain priority vocabulary", () => {
    render(
      <TrailPriorityPropertySelect
        onValueChange={vi.fn()}
        value={undefined}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Priority: No priority" }),
    ).toHaveTextContent("No priority");
  });

  it("lets the consumer own whether the edit is currently available", () => {
    render(
      <TrailPriorityPropertySelect
        disabled
        onValueChange={vi.fn()}
        value="medium"
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Priority: Medium" }),
    ).toBeDisabled();
  });
});
