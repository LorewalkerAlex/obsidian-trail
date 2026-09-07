import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("TrailProjectProductionSpecimens", () => {
  it("calibrates production Status and Project Summary owners from resolved fixtures", () => {
    const { container } = render(<TrailProjectProductionSpecimens />);

    const statusGallery = within(screen.getByRole("group", { name: "Status presentation" }));
    expect(statusGallery.getByRole("img", { name: "Backlog status" })).toBeInTheDocument();
    expect(statusGallery.getByRole("img", { name: "Todo status" })).toBeInTheDocument();
    expect(statusGallery.getByRole("img", { name: "In Progress status" })).toBeInTheDocument();
    expect(statusGallery.getByRole("img", { name: "Done status" })).toBeInTheDocument();
    expect(statusGallery.getByRole("img", { name: "Canceled status" })).toBeInTheDocument();

    const rowGallery = within(screen.getByRole("group", { name: "Project summary row" }));
    expect(rowGallery.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(rowGallery.getByText("Rebuild the Projects scanning hierarchy"))
      .toBeInTheDocument();
    expect(rowGallery.getByText("Retired project with no current progress denominator"))
      .toBeInTheDocument();
    expect(rowGallery.getByRole("progressbar", {
      name: "Retired project with no current progress denominator progress",
    })).toHaveAttribute("aria-valuetext", "Unavailable");
    expect(container.querySelectorAll("[data-project-summary-row='true']")).toHaveLength(4);
  });
});
