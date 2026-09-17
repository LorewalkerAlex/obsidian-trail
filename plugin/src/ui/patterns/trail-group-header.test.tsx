import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailGroupHeader } from "./trail-group-header";

describe("TrailGroupHeader", () => {
  it("keeps disclosure separate from an actionable entity identity", () => {
    const onExpandedChange = vi.fn();
    const onIdentityActivate = vi.fn();

    render(
      <TrailGroupHeader
        count={4}
        expanded
        label="Initiative Alpha"
        onExpandedChange={onExpandedChange}
        onIdentityActivate={onIdentityActivate}
      />,
    );

    const disclosure = screen.getByRole("button", { name: "Collapse Initiative Alpha" });
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("4")).toHaveClass("trail-group-header__count");
    expect(screen.getByText("4").parentElement).toHaveClass("trail-group-header__summary");

    fireEvent.click(disclosure);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(onIdentityActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Initiative Alpha" }));
    expect(onIdentityActivate).toHaveBeenCalledTimes(1);
  });

  it("keeps optional semantic leading content inside the identity cluster", () => {
    const onExpandedChange = vi.fn();

    render(
      <TrailGroupHeader
        count={3}
        expanded
        label="In Progress"
        leading={<span data-testid="status-leading">Status</span>}
        onExpandedChange={onExpandedChange}
      />,
    );

    const leading = screen.getByTestId("status-leading");
    const leadingSlot = leading.parentElement;
    const summary = leadingSlot?.parentElement;

    expect(leadingSlot).toHaveClass("trail-group-header__leading");
    expect(summary).toHaveClass("trail-group-header__summary");
    expect(summary?.children[0]).toHaveClass("trail-group-header__leading");
    expect(summary?.children[1]).toHaveClass("trail-group-header__identity");
    expect(summary?.children[2]).toHaveClass("trail-group-header__count");
  });

  it("renders a grouping label without inventing an entity navigation target", () => {
    const onExpandedChange = vi.fn();

    render(
      <TrailGroupHeader
        count={0}
        expanded={false}
        label="No Initiative"
        onExpandedChange={onExpandedChange}
      />,
    );

    const disclosure = screen.getByRole("button", { name: "Expand No Initiative" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "No Initiative" })).not.toBeInTheDocument();
    expect(screen.getByText("No Initiative")).toHaveClass("trail-group-header__identity");

    fireEvent.click(disclosure);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});
