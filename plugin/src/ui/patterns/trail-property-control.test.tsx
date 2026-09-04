import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailPropertyControl } from "./trail-property-control";

describe("TrailPropertyControl", () => {
  it("provides the normal property-action shell without owning property semantics", () => {
    render(
      <TrailPropertyControl aria-haspopup="listbox">
        <span aria-hidden="true">◉</span>
        In progress
      </TrailPropertyControl>,
    );

    const control = screen.getByRole("button", { name: "In progress" });

    expect(control).toHaveClass(
      "trail-property-control",
      "trail-property-control--normal",
    );
    expect(control).toHaveAttribute("data-density", "normal");
    expect(control).toHaveAttribute("aria-haspopup", "listbox");
    expect(control).toHaveAttribute("type", "button");
  });

  it("exposes the compact density through the same production owner", () => {
    render(
      <TrailPropertyControl density="compact">M</TrailPropertyControl>,
    );

    const control = screen.getByRole("button", { name: "M" });
    expect(control).toHaveClass("trail-property-control--compact");
    expect(control).toHaveAttribute("data-density", "compact");
  });

  it("preserves native disabled behavior as an explicit reusable state", () => {
    const onClick = vi.fn();

    render(
      <TrailPropertyControl disabled onClick={onClick}>
        Unavailable
      </TrailPropertyControl>,
    );

    const control = screen.getByRole("button", { name: "Unavailable" });
    expect(control).toBeDisabled();
    fireEvent.click(control);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards native interaction without adding picker or mutation behavior", () => {
    const onClick = vi.fn();

    render(
      <TrailPropertyControl aria-expanded="false" onClick={onClick}>
        Project Trail
      </TrailPropertyControl>,
    );

    const control = screen.getByRole("button", { name: "Project Trail" });
    fireEvent.click(control);

    expect(onClick).toHaveBeenCalledOnce();
    expect(control).toHaveAttribute("aria-expanded", "false");
  });
});
