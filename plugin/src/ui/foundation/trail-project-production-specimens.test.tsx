import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("TrailProjectProductionSpecimens", () => {
  it("shows workflow Status and Project Status inside realistic collection rows", () => {
    const { container } = render(<TrailProjectProductionSpecimens />);

    const workflowGallery = within(screen.getByRole("group", { name: "Workflow status rows" }));
    expect(workflowGallery.getByText("Issue workflow")).toBeInTheDocument();
    expect(workflowGallery.getByText("5 states")).toBeInTheDocument();
    expect(workflowGallery.getByRole("img", { name: "Backlog status" }))
      .toHaveAttribute("data-status-entity-type", "issue");
    expect(workflowGallery.getByRole("img", { name: "Todo status" })).toBeInTheDocument();
    expect(workflowGallery.getByRole("img", { name: "In Progress status" })).toBeInTheDocument();
    expect(workflowGallery.getByRole("img", { name: "Done status" })).toBeInTheDocument();
    expect(workflowGallery.getByRole("img", { name: "Canceled status" })).toBeInTheDocument();
    expect(workflowGallery.getByText("Calibrate the Projects scanning hierarchy"))
      .toBeInTheDocument();
    expect(container.querySelectorAll("[data-workflow-status-row='true']")).toHaveLength(5);

    const projectGallery = within(screen.getByRole("group", { name: "Project summary rows" }));
    expect(projectGallery.getByRole("img", { name: "Planned status" }))
      .toHaveAttribute("data-status-entity-type", "project");
    expect(projectGallery.getByRole("img", { name: "In Progress status" }))
      .toHaveAttribute("data-status-entity-type", "project");
    expect(projectGallery.getByRole("img", { name: "Completed status" }))
      .toHaveAttribute("data-status-entity-type", "project");
    expect(projectGallery.getByRole("img", { name: "Canceled status" }))
      .toHaveAttribute("data-status-entity-type", "project");
    expect(projectGallery.getByText("Rebuild the Projects scanning hierarchy"))
      .toBeInTheDocument();
    expect(projectGallery.getByText("Retired project with no current progress denominator"))
      .toBeInTheDocument();
    expect(projectGallery.getByRole("progressbar", {
      name: "Retired project with no current progress denominator progress",
    })).toHaveAttribute("aria-valuetext", "Unavailable");
    expect(container.querySelectorAll("[data-project-summary-row='true']")).toHaveLength(4);
  });
});
