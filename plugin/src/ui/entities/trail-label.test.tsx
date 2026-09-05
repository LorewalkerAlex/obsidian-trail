import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TrailLabelPropertySelect,
  nextTrailLabelSelection,
} from "./trail-label-property-select";
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

describe("TrailLabelPropertySelect", () => {
  const groups = [
    {
      id: "group-area",
      name: "Area",
      registeredEntityTypes: ["issue" as const],
      selectionMode: "single" as const,
    },
    {
      id: "group-tech",
      name: "Technology",
      registeredEntityTypes: ["issue" as const],
      selectionMode: "multiple" as const,
    },
    {
      id: "group-project",
      name: "Project Area",
      registeredEntityTypes: ["project" as const],
      selectionMode: "single" as const,
    },
  ];
  const labels = [
    { groupId: "group-area", id: "label-work", name: "Work" },
    { groupId: "group-area", id: "label-personal", name: "Personal" },
    { groupId: "group-tech", id: "label-ts", name: "TypeScript" },
    { groupId: "group-tech", id: "label-css", name: "CSS" },
    { groupId: "group-project", id: "label-delivery", name: "Delivery" },
  ];

  it("replaces a sibling only inside a single-select Label group", () => {
    expect(nextTrailLabelSelection({
      group: groups[0],
      labels,
      selectedLabelIds: ["label-work", "label-ts"],
      toggledLabelId: "label-personal",
    })).toEqual(["label-ts", "label-personal"]);
  });

  it("toggles values independently inside a multiple-select Label group", () => {
    expect(nextTrailLabelSelection({
      group: groups[1],
      labels,
      selectedLabelIds: ["label-work", "label-ts"],
      toggledLabelId: "label-css",
    })).toEqual(["label-work", "label-ts", "label-css"]);

    expect(nextTrailLabelSelection({
      group: groups[1],
      labels,
      selectedLabelIds: ["label-work", "label-ts"],
      toggledLabelId: "label-ts",
    })).toEqual(["label-work"]);
  });

  it("uses the shared PropertyControl trigger with explicit selected names", () => {
    render(
      <TrailLabelPropertySelect
        groups={groups}
        labels={labels}
        onValueChange={vi.fn()}
        value={["label-work", "label-ts"]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Labels: TypeScript, Work" });
    expect(trigger).toHaveClass("trail-property-control");
    expect(trigger).toHaveTextContent("TypeScript, Work");
  });

  it("uses the requested entity registration and modal-child transient layer", () => {
    render(
      <TrailLabelPropertySelect
        entityType="project"
        groups={groups}
        labels={labels}
        layer="modal-child"
        onValueChange={vi.fn()}
        value={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Labels: No labels" }));
    const picker = screen.getByRole("dialog", { name: "Labels" });
    expect(picker).toHaveAttribute("data-trail-transient-layer", "modal-child");
    expect(screen.getByText("Project Area")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delivery/ })).toBeInTheDocument();
    expect(screen.queryByText("Technology")).not.toBeInTheDocument();
  });

});
