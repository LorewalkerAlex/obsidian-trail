import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getTrailEstimatePresentation,
  TRAIL_ESTIMATE_PRESENTATION_VALUES,
  TrailEstimateValue,
} from "./trail-estimate";

describe("Trail estimate presentation", () => {
  it("keeps the fixed T-Shirt vocabulary behind one semantic presentation owner", () => {
    expect(TRAIL_ESTIMATE_PRESENTATION_VALUES.map((estimate) => ({
      estimate,
      ...getTrailEstimatePresentation(estimate),
    }))).toEqual([
      { estimate: undefined, label: "No estimate", shortLabel: "" },
      { estimate: "small", label: "Small", shortLabel: "S" },
      { estimate: "medium", label: "Medium", shortLabel: "M" },
      { estimate: "large", label: "Large", shortLabel: "L" },
      { estimate: "xlarge", label: "Extra large", shortLabel: "XL" },
    ]);
  });

  it("renders a compact scanning value only when Estimate is present", () => {
    const { rerender } = render(<TrailEstimateValue estimate="large" />);
    expect(screen.getByText("L")).toHaveAttribute("aria-label", "Large estimate");

    rerender(<TrailEstimateValue estimate={undefined} />);
    expect(screen.queryByText("L")).not.toBeInTheDocument();
  });
});
