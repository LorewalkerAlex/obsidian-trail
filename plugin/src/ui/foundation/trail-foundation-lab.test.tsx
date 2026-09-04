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
    expect(screen.getByRole("progressbar", { name: "Progress partial" })).toHaveClass(
      "trail-progress",
      "trail-progress--normal",
    );
    expect(screen.getByRole("progressbar", { name: "Progress compact" })).toHaveClass(
      "trail-progress--compact",
    );
    expect(screen.getByRole("progressbar", { name: "Progress micro" })).toHaveClass(
      "trail-progress--micro",
    );
    expect(screen.getByRole("progressbar", { name: "Progress unavailable" })).toHaveAttribute(
      "aria-valuetext",
      "Unavailable",
    );
    expect(screen.getByRole("separator", { name: "Separator specimen" })).toHaveClass("trail-separator");
    expect(screen.getByRole("button", { name: "In progress" })).toHaveClass(
      "trail-property-control",
      "trail-property-control--normal",
    );
    expect(screen.getByRole("button", { name: "M" })).toHaveClass(
      "trail-property-control--compact",
    );
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
    const collectionControls = within(screen.getByRole("group", {
      name: "Project workspace view controls",
    }));
    expect(collectionControls.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(collectionControls.getByRole("group", { name: "Project layout" })).toBeInTheDocument();
    expect(collectionControls.queryByRole("button", { name: "Display" })).not.toBeInTheDocument();
    expect(screen.getByText("Selected collection row")).toBeInTheDocument();
    expect(screen.getByText("Review urgent capture before the next planning pass")).toBeInTheDocument();

    const rowContents = Array.from(container.querySelectorAll(".trail-lab-list-row__content"));
    expect(rowContents.length).toBeGreaterThan(0);
    for (const rowContent of rowContents) {
      const directRegions = Array.from(rowContent.children);
      expect(directRegions).toHaveLength(3);
      expect(directRegions[0]).toHaveClass("trail-lab-list-row__id");
      expect(directRegions[1]).toHaveClass("trail-lab-list-row__primary");
      expect(directRegions[2]).toHaveClass("trail-lab-list-row__trailing");
    }

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

    const intentSpecimen = screen.getByRole("group", {
      name: "Row intent separation",
    });
    const property = within(intentSpecimen).getByRole("button", {
      name: "Change inline status",
    });
    const propertyRegion = property.closest(".trail-lab-list-row__trailing");
    expect(propertyRegion).not.toBeNull();
    expect(propertyRegion?.parentElement).toHaveClass("trail-lab-list-row__content");

    const intentPrimary = intentSpecimen.querySelector(".trail-lab-list-row__primary");
    expect(intentPrimary).not.toBeNull();
    expect(Array.from(intentPrimary?.children ?? [])).toHaveLength(1);
    expect(intentPrimary?.children[0]).toHaveClass("trail-lab-list-row__title");

    const interactionFeedback = within(intentSpecimen).getByRole("status");
    expect(interactionFeedback).toHaveTextContent("Row activations: 0 · Property actions: 0");
    expect(interactionFeedback.closest(".trail-lab-list-row__content")).toBeNull();

    fireEvent.click(property);
    expect(interactionFeedback).toHaveTextContent("Row activations: 0 · Property actions: 1");
    fireEvent.click(within(intentSpecimen).getByText("Activate row content"));
    expect(interactionFeedback).toHaveTextContent("Row activations: 1 · Property actions: 1");

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
