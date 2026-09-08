import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab", () => {
  it("separates visual state, composition, and live mechanics coverage", () => {
    const { container } = render(
      <TrailFoundationLab control={{ kind: "ready" }} revision={7} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Visual Foundations",
      "Primitives",
      "Patterns",
      "Semantic Entities",
      "Compositions",
      "Interaction Mechanics",
    ]);

    for (const category of [
      "Visual Foundations",
      "Primitives",
      "Patterns",
      "Semantic Entities",
      "Compositions",
      "Interaction Mechanics",
    ]) {
      expect(screen.getByRole("region", { name: category })).toBeInTheDocument();
    }

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("r7")).toBeInTheDocument();
    expect(screen.getByText("Production owners only")).toBeInTheDocument();
    expect(screen.getByText("Visual states visible by default")).toBeInTheDocument();
    expect(screen.getAllByText("Composition Gallery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live Mechanics").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-lab-specimen-kind='state-gallery']").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-lab-specimen-kind='composition-gallery']").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-lab-specimen-kind='live-mechanics']").length).toBeGreaterThan(0);

    const buttonGallery = within(screen.getByRole("group", { name: "Button" }));
    expect(buttonGallery.getByRole("button", { name: "Hover" })).toHaveAttribute("data-trail-visual-state", "hover");
    expect(buttonGallery.getByRole("button", { name: "Pressed" })).toHaveAttribute("data-trail-visual-state", "pressed");
    expect(buttonGallery.getByRole("button", { name: "Focus" })).toHaveAttribute("data-trail-visual-state", "focus");
    expect(buttonGallery.getByRole("button", { name: "Rest primary" })).toHaveClass("trail-button--primary");
    expect(screen.getByRole("button", { name: "Icon hover" })).toHaveClass("trail-icon-button");
    expect(screen.getByRole("textbox", { name: "Input hover" })).toHaveAttribute("data-trail-visual-state", "hover");
    expect(screen.getByRole("textbox", { name: "Input focus" })).toHaveAttribute("data-trail-visual-state", "focus");
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
    const propertyControlGallery = within(screen.getByRole("group", { name: "Property control" }));
    expect(propertyControlGallery.getByRole("button", { name: "Hover" })).toHaveAttribute(
      "data-trail-visual-state",
      "hover",
    );
    const viewActionGallery = within(screen.getByRole("group", { name: "View action" }));
    expect(viewActionGallery.getByRole("button", { name: "View action hover" })).toHaveAttribute(
      "data-trail-visual-state",
      "hover",
    );
    expect(screen.getByRole("button", { name: "M" })).toHaveClass(
      "trail-property-control--compact",
    );
    expect(propertyControlGallery.getByRole("button", { name: "Disabled" })).toBeDisabled();
    const collectionControls = within(screen.getByRole("group", {
      name: "Project workspace view controls",
    }));
    expect(collectionControls.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(collectionControls.getByRole("group", { name: "Project layout" })).toBeInTheDocument();
    expect(collectionControls.queryByRole("button", { name: "Display" })).not.toBeInTheDocument();
    expect(screen.getByText("Hover collection row").closest(".trail-collection-row"))
      .toHaveAttribute("data-trail-visual-state", "hover");
    expect(screen.getByText("Selected collection row")).toBeInTheDocument();
    expect(screen.getByText("Review urgent capture before the next planning pass")).toBeInTheDocument();

    const popoverGallery = within(screen.getByRole("group", { name: "Popover surface states" }));
    const compactMenu = within(popoverGallery.getByRole("group", { name: "Compact menu visual states" }));
    expect(compactMenu.getByRole("button", { name: "Hover item" })).toHaveAttribute(
      "data-trail-visual-state",
      "hover",
    );
    expect(compactMenu.getByRole("button", { name: "Selected item" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(compactMenu.getByText("✓")).toHaveAttribute("data-visible", "true");
    const searchMenu = within(popoverGallery.getByRole("group", { name: "Search menu visual states" }));
    expect(searchMenu.getByRole("searchbox", { name: "Static menu search" })).toHaveAttribute(
      "data-trail-visual-state",
      "focus",
    );

    const priorityGallery = within(screen.getByRole("group", { name: "Priority property" }));
    expect(priorityGallery.getByRole("combobox", { name: "Priority: No priority" })).toBeInTheDocument();
    expect(priorityGallery.getByRole("combobox", { name: "Priority: Urgent" })).toBeInTheDocument();
    expect(priorityGallery.getAllByRole("combobox", { name: "Priority: High" })).toHaveLength(2);

    const priorityPicker = within(screen.getByRole("group", { name: "Priority picker surface" }));
    const priorityListbox = within(priorityPicker.getByRole("listbox", { name: "Priority picker visual states" }));
    expect(priorityListbox.getByRole("option", { name: "High" })).toHaveAttribute("aria-selected", "true");
    expect(priorityListbox.getByRole("option", { name: "Medium" })).toHaveAttribute("data-highlighted");
    expect(priorityListbox.getByRole("option", { name: "High" }).querySelector(".trail-priority-select__check"))
      .not.toBeNull();

    const labelPicker = within(screen.getByRole("group", { name: "Label picker surfaces" }));
    const selectedLabels = within(labelPicker.getByRole("group", { name: "Label picker selected states" }));
    const onboardingOption = selectedLabels.getByRole("button", { name: /Onboarding/ });
    expect(onboardingOption).toHaveAttribute("aria-pressed", "true");
    expect(onboardingOption.querySelector(".trail-label-select__check"))
      .toHaveAttribute("data-visible", "true");
    expect(labelPicker.getByText("No labels found.")).toBeInTheDocument();

    const duePicker = within(screen.getByRole("group", { name: "Due picker surface" }));
    expect(duePicker.getByRole("group", { name: "Due picker visual state" })).toBeInTheDocument();
    expect(duePicker.getByLabelText("Static review due date")).toHaveValue("2026-09-12");

    const propertyFamily = within(screen.getByRole("group", { name: "Triage property family" }));
    expect(propertyFamily.getByRole("combobox", { name: "Priority: High" })).toBeInTheDocument();
    expect(propertyFamily.getByRole("button", { name: "Labels: Design, Onboarding" })).toBeInTheDocument();
    expect(propertyFamily.getByRole("button", { name: "Review due" })).toBeInTheDocument();

    const triageViewControls = within(screen.getByRole("group", { name: "Triage collection controls" }));
    expect(triageViewControls.getByRole("group", { name: "Triage view controls" })).toBeInTheDocument();
    expect(triageViewControls.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(triageViewControls.getByRole("button", { name: "Order: Review due" })).toBeInTheDocument();

    const triageReview = within(screen.getByRole("group", { name: "Triage review surface" }));
    expect(triageReview.getByRole("region", { name: "Triage review" })).toBeInTheDocument();
    expect(triageReview.getByRole("button", { name: "Accept Triage entry" })).toBeInTheDocument();
    expect(triageReview.getByRole("textbox", { name: "Triage title" })).toHaveValue(
      "Review the Trail creation experience",
    );

    const confirmationFamily = screen.getByRole("group", { name: "Confirmation family" });
    expect(confirmationFamily.querySelectorAll(".trail-confirmation__surface")).toHaveLength(2);
    expect(within(confirmationFamily).getByText("Confirm action?")).toBeInTheDocument();
    expect(within(confirmationFamily).getByRole("button", { name: "Confirm" })).toHaveClass(
      "trail-button--primary",
    );
    expect(within(confirmationFamily).getByText("Delete this Triage entry?")).toBeInTheDocument();
    expect(within(confirmationFamily).getByRole("button", { name: "Delete" })).toHaveAttribute(
      "data-confirmation-tone",
      "danger",
    );
    expect(screen.queryByRole("button", { name: "Open composer specimen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open delete confirmation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

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
  }, 30_000);

  it("keeps shared live mechanics wired once without using composition cases as workflow tests", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={8} />);

    const actionSpecimen = within(screen.getByRole("group", { name: "Action activation" }));
    const actionFeedback = actionSpecimen.getByRole("status");
    expect(actionFeedback).toHaveTextContent("Action activations: 0");
    fireEvent.click(actionSpecimen.getByRole("button", { name: "Activate action" }));
    expect(actionFeedback).toHaveTextContent("Action activations: 1");

    const popoverMechanics = within(screen.getByRole("group", { name: "Popover transition" }));
    const popoverFeedback = popoverMechanics.getByRole("status");
    expect(popoverFeedback).toHaveTextContent("Popover choice: Issue · closed");
    fireEvent.click(popoverMechanics.getByRole("button", { name: "Open popover mechanics" }));
    expect(popoverFeedback).toHaveTextContent("Popover choice: Issue · open");
    const mechanicsPopover = screen.getByLabelText("Mechanics popover");
    fireEvent.click(within(mechanicsPopover).getByRole("button", { name: "Project" }));
    expect(popoverFeedback).toHaveTextContent("Popover choice: Project · closed");
    expect(screen.queryByLabelText("Mechanics popover")).not.toBeInTheDocument();

    const propertySelection = within(screen.getByRole("group", { name: "Property selection" }));
    expect(propertySelection.getByRole("combobox", { name: "Priority: High" })).toBeInTheDocument();

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
      name: "Choice transition",
    });
    const listLayout = within(layoutSpecimen).getByRole("button", { name: "Live list layout" });
    const boardLayout = within(layoutSpecimen).getByRole("button", { name: "Live board layout" });

    expect(listLayout).toHaveAttribute("aria-pressed", "true");
    expect(boardLayout).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(boardLayout);
    expect(listLayout).toHaveAttribute("aria-pressed", "false");
    expect(boardLayout).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Current: board")).toBeInTheDocument();
  }, 30_000);
});
