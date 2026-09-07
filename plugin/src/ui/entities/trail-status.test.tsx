import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TrailStatusCategory } from "../../domain/model/trail-values";
import { TrailStatusGlyph } from "./trail-status";

const CASES = [
  ["backlog", "Backlog"],
  ["unstarted", "Todo"],
  ["started", "In Progress"],
  ["completed", "Done"],
  ["canceled", "Canceled"],
] as const satisfies readonly (readonly [TrailStatusCategory, string])[];

describe("TrailStatusGlyph", () => {
  it("keeps configured labels accessible while category owns the visual identity", () => {
    render(
      <>
        {CASES.map(([category, label]) => (
          <TrailStatusGlyph category={category} key={category} label={label} />
        ))}
      </>,
    );

    for (const [category, label] of CASES) {
      expect(screen.getByRole("img", { name: `${label} status` }))
        .toHaveAttribute("data-status-category", category);
    }
  });

  it("can be decorative when visible text already supplies the status name", () => {
    const { container } = render(
      <TrailStatusGlyph category="started" decorative />,
    );

    const glyph = container.querySelector(".trail-status-glyph");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses category-specific marks without encoding configured names into shape", () => {
    const { container } = render(
      <>
        <TrailStatusGlyph category="started" label="Doing" />
        <TrailStatusGlyph category="completed" label="Shipped" />
        <TrailStatusGlyph category="canceled" label="Dropped" />
      </>,
    );

    expect(container.querySelector("[data-status-category='started'] .trail-status-glyph__progress"))
      .not.toBeNull();
    expect(container.querySelector("[data-status-category='completed'] .trail-status-glyph__check"))
      .not.toBeNull();
    expect(container.querySelector("[data-status-category='canceled'] .trail-status-glyph__cancel"))
      .not.toBeNull();
  });
});
