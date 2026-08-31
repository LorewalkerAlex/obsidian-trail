import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailPropertyControl } from "./trail-property-control";

describe("TrailPropertyControl", () => {
  it("provides a compact property-action shell without owning property semantics", () => {
    render(
      <TrailPropertyControl aria-haspopup="listbox">
        <span aria-hidden="true">◉</span>
        In progress
      </TrailPropertyControl>,
    );

    const control = screen.getByRole("button", { name: "In progress" });

    expect(control).toHaveClass("trail-property-control");
    expect(control).not.toHaveClass("trail-property-control--compact");
    expect(control).toHaveAttribute("aria-haspopup", "listbox");
    expect(control).toHaveAttribute("type", "button");
  });

  it("exposes only the proven compact density variant", () => {
    render(
      <TrailPropertyControl density="compact">M</TrailPropertyControl>,
    );

    expect(screen.getByRole("button", { name: "M" })).toHaveClass(
      "trail-property-control--compact",
    );
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
