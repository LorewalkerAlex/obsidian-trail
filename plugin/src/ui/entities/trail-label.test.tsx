import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailLabelDots, trailLabelColorSlot } from "./trail-label";

describe("TrailLabelDots", () => {
  it("keeps presentation color stable by Label identity while current names remain live", () => {
    const label = { groupId: "group-a", id: "label-stable", name: "Before rename" };
    const { container, rerender } = render(<TrailLabelDots labels={[label]} />);
    const initialSlot = container.querySelector(".trail-label-dot")?.getAttribute("data-color-slot");

    expect(initialSlot).toBe(String(trailLabelColorSlot(label.id)));
    expect(Number(initialSlot)).toBeGreaterThanOrEqual(0);
    expect(Number(initialSlot)).toBeLessThan(6);

    rerender(<TrailLabelDots labels={[{ ...label, name: "After rename" }]} />);

    expect(container.querySelector(".trail-label-dot")).toHaveAttribute("data-color-slot", initialSlot);
    expect(screen.getByRole("img", { name: "Labels: After rename" })).toBeInTheDocument();
  });

  it("presents compact dots with explicit accessible Label names", () => {
    const { container } = render(
      <TrailLabelDots
        labels={[
          { groupId: "group-b", id: "label-b", name: "TypeScript" },
          { groupId: "group-a", id: "label-a", name: "Personal" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Labels: Personal, TypeScript" })).toBeInTheDocument();
    expect(container.querySelectorAll(".trail-label-dot")).toHaveLength(2);
  });
});
