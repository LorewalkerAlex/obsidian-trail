import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab", () => {
  it("organizes current production owners into the frozen showroom hierarchy", () => {
    const { container } = render(
      <TrailFoundationLab control={{ kind: "ready" }} revision={7} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Visual Foundations",
      "Primitives",
      "Patterns",
      "Semantic Entities",
      "Interactions",
    ]);

    for (const category of [
      "Visual Foundations",
      "Primitives",
      "Patterns",
      "Semantic Entities",
      "Interactions",
    ]) {
      expect(screen.getByRole("region", { name: category })).toBeInTheDocument();
    }

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("r7")).toBeInTheDocument();
    expect(screen.getByText("Production owners only")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-lab-specimen-kind='state-gallery']").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-lab-specimen-kind='live-interaction']").length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: "Create issue" })).toHaveClass("trail-button--primary");
    expect(screen.getByRole("button", { name: "Search specimen" })).toHaveClass("trail-icon-button");
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveClass("trail-input");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveClass("trail-textarea");
    expect(screen.getByRole("checkbox", { name: "Checked specimen" })).toBeChecked();
    expect(screen.getByRole("progressbar", { name: "Progress partial" })).toHaveClass("trail-progress");
    expect(screen.getByRole("separator", { name: "Separator specimen" })).toHaveClass("trail-separator");
    expect(screen.getByRole("button", { name: "In progress" })).toHaveClass("trail-property-control");
    expect(screen.getByText("Selected collection row")).toBeInTheDocument();
    expect(screen.getByText("Review urgent capture before the next planning pass")).toBeInTheDocument();

    expect(screen.queryByText("Overlays and composer")).not.toBeInTheDocument();
    expect(screen.queryByText("Improve project creation flow")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  }, 15_000);

  it("keeps live interaction specimens wired to their production owners", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={8} />);

    const selectionSpecimen = screen.getByRole("group", {
      name: "Selection feedback",
    });
    expect(selectionSpecimen).not.toHaveAttribute("aria-label");
    expect(selectionSpecimen).toHaveAttribute("aria-labelledby");
    expect(selectionSpecimen).toHaveAttribute("aria-describedby");

    const selection = within(selectionSpecimen).getByRole("checkbox", {
      name: "Select interactive collection row",
    });
    const selectionRow = selectionSpecimen.querySelector(".trail-collection-row");

    expect(selection).not.toBeChecked();
    expect(selectionRow).not.toHaveAttribute("data-selected", "true");
    fireEvent.click(selection);
    expect(selection).toBeChecked();
    expect(selectionRow).toHaveAttribute("data-selected", "true");

    const layoutSpecimen = screen.getByRole("group", {
      name: "Layout choice",
    });
    const listLayout = within(layoutSpecimen).getByRole("button", { name: "Live list layout" });
    const boardLayout = within(layoutSpecimen).getByRole("button", { name: "Live board layout" });

    expect(listLayout).toHaveAttribute("aria-pressed", "true");
    expect(boardLayout).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(boardLayout);
    expect(listLayout).toHaveAttribute("aria-pressed", "false");
    expect(boardLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Current: board")).toBeInTheDocument();
  }, 15_000);
});
