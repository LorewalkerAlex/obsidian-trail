import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TrailDuePickerStateSpecimen,
  TrailLabelPickerStateSpecimen,
  TrailPriorityPickerStateSpecimen,
  TrailViewPopoverStateSpecimen,
} from "./trail-transient-state-specimens";

describe("Trail transient state specimens", () => {
  it("preserves intrinsic transient geometry hooks instead of stretching static surfaces", () => {
    const { container } = render(
      <>
        <TrailPriorityPickerStateSpecimen />
        <TrailLabelPickerStateSpecimen />
        <TrailDuePickerStateSpecimen />
        <TrailViewPopoverStateSpecimen />
      </>,
    );

    expect(container.querySelectorAll(".trail-lab-transient-surface")).toHaveLength(2);
    expect(container.querySelectorAll(".trail-lab-state-grid")).toHaveLength(2);
  });

  it("keeps Priority selection and highlight as separate left-aligned visual states", () => {
    render(<TrailPriorityPickerStateSpecimen />);

    const listbox = within(screen.getByRole("listbox", {
      name: "Priority picker visual states",
    }));
    const high = listbox.getByRole("option", { name: "High" });
    const medium = listbox.getByRole("option", { name: "Medium" });

    expect(high).toHaveAttribute("aria-selected", "true");
    expect(high).toHaveAttribute("data-state", "checked");
    expect(high.children[0]).toHaveClass("trail-priority-select__indicator");
    expect(high.children[1]).toHaveClass("trail-priority-select__glyph");
    expect(high.children[2]).toHaveTextContent("High");
    expect(medium).toHaveAttribute("data-highlighted");
    expect(medium).toHaveAttribute("data-state", "unchecked");
  });

  it("renders Label selection as a left checkbox slot before color and name", () => {
    render(<TrailLabelPickerStateSpecimen />);

    const picker = within(screen.getByRole("group", {
      name: "Label picker selected states",
    }));
    const onboarding = picker.getByRole("button", { name: /Onboarding/ });
    const design = picker.getByRole("button", { name: /Design/ });
    const search = picker.getByRole("searchbox", { name: "Static label search" });

    expect(search).toHaveClass("trail-view-popover__search");
    expect(onboarding.children[0]).toHaveClass("trail-label-select__check");
    expect(onboarding.children[0]).toHaveAttribute("data-visible", "true");
    expect(onboarding.children[1]).toHaveClass("trail-label-dots");
    expect(onboarding.children[2]).toHaveClass("trail-label-select__name");
    expect(design.children[0]).toHaveAttribute("data-visible", "false");
    expect(screen.getByText("No labels found.")).toBeInTheDocument();
  });
});
