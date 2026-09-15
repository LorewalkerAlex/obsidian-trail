import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailSegmentedSummary } from "./trail-segmented-summary";

describe("TrailSegmentedSummary", () => {
  it("owns framed segmented-summary geometry for Inspector consumers", () => {
    render(
      <TrailSegmentedSummary
        label="Project attention"
        segments={[
          { id: "overdue", label: "Overdue", value: 2 },
          { id: "week", label: "This week", value: 3 },
          { id: "later", label: "Later", value: 4 },
        ]}
      />,
    );

    const summary = screen.getByRole("group", { name: "Project attention" });
    expect(summary).toHaveClass("trail-segmented-summary--framed");
    expect(within(summary).getByLabelText("Overdue: 2")).toBeInTheDocument();
    expect(within(summary).getByLabelText("This week: 3")).toBeInTheDocument();
    expect(within(summary).getByLabelText("Later: 4")).toBeInTheDocument();
  });

  it("supports the open inline presentation used by Home without changing the owner", () => {
    render(
      <TrailSegmentedSummary
        appearance="inline"
        label="Triage pressure"
        segments={[
          { id: "overdue", label: "overdue", tone: "attention", value: 2 },
          { id: "remain", label: "remain", value: 5 },
        ]}
      />,
    );

    const summary = screen.getByRole("group", { name: "Triage pressure" });
    expect(summary).toHaveClass("trail-segmented-summary--inline");
    expect(within(summary).getByLabelText("overdue: 2")).toHaveAttribute("data-tone", "attention");
    expect(within(summary).getByLabelText("remain: 5")).toBeInTheDocument();
  });
});
