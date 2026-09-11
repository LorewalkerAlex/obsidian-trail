import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailEstimatePropertySelect } from "./trail-estimate-property-select";

describe("TrailEstimatePropertySelect", () => {
  it("presents semantic labels while keeping the compact T-shirt trigger", () => {
    const onValueChange = vi.fn();
    render(<TrailEstimatePropertySelect onValueChange={onValueChange} value="medium" />);

    fireEvent.click(screen.getByRole("button", { name: "Estimate: Medium" }));
    const popover = screen.getByLabelText("Estimate");
    expect(within(popover).getByRole("button", { name: /No estimate/ })).toBeInTheDocument();
    fireEvent.click(within(popover).getByRole("button", { name: /Large/ }));
    expect(onValueChange).toHaveBeenCalledWith("large");
  });

  it("removes the illegal empty option when Estimate is required", () => {
    render(
      <TrailEstimatePropertySelect
        onValueChange={() => {}}
        required
        value="small"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Estimate: Small" });
    expect(trigger).toHaveAttribute("aria-required", "true");
    fireEvent.click(trigger);
    expect(within(screen.getByLabelText("Estimate")).queryByText("No estimate"))
      .not.toBeInTheDocument();
  });
});
