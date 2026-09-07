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

    fireEvent.click(disclosure);
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(onIdentityActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Initiative Alpha" }));
    expect(onIdentityActivate).toHaveBeenCalledTimes(1);
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
