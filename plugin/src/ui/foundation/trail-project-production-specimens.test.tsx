import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("TrailProjectProductionSpecimens", () => {
  it("uses the production Workflow Issue Row for Status states and Project Workspace composition", () => {
    const { container } = render(<TrailProjectProductionSpecimens />);

    const workflowGalleryElement = screen.getByRole("group", { name: "Workflow status rows" });
    const workflowGallery = within(workflowGalleryElement);
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
    expect(workflowGalleryElement.querySelectorAll("[data-workflow-issue-row='true']"))
      .toHaveLength(5);
    expect(workflowGalleryElement.querySelector("[data-workflow-status-row='true']"))
      .toBeNull();
    expect(workflowGallery.queryByText(/TRAIL-\d+/)).not.toBeInTheDocument();

    const issueGalleryElement = screen.getByRole("group", { name: "Project workspace issue rows" });
    const issueGallery = within(issueGalleryElement);
    expect(issueGallery.getByRole("button", { name: "Collapse In progress" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(issueGallery.getByText("Establish workspace page composition")).toBeInTheDocument();
    expect(issueGallery.getByText("Verify a deliberately long Issue title keeps the soft metadata columns readable under ordinary width pressure")).toBeInTheDocument();
    expect(issueGallery.getByText("Workspace interaction pass")).toBeInTheDocument();
    expect(issueGallery.getByLabelText("In current cycle")).toHaveTextContent("Current");
    expect(issueGallery.getByLabelText("Large estimate")).toHaveTextContent("L");
    expect(issueGallery.getAllByRole("img", { name: "In Progress status" }))
      .toHaveLength(3);
    expect(issueGallery.queryByText("In Progress", { selector: ".trail-workflow-issue-row__content *" }))
      .not.toBeInTheDocument();
    const issueRows = Array.from(issueGalleryElement.querySelectorAll("[data-workflow-issue-row='true']"));
    expect(issueRows).toHaveLength(3);
    for (const issueRow of issueRows) {
      expect(issueRow.querySelector(".trail-workflow-issue-row__content")?.children)
        .toHaveLength(3);
      expect(issueRow.querySelector(".trail-workflow-issue-row__metadata")?.children)
        .toHaveLength(5);
    }
    expect(issueGallery.getByRole("checkbox", { name: "Deselect Establish workspace page composition" }))
      .toBeChecked();
    expect(issueGallery.queryByRole("img", { name: "No priority" })).not.toBeInTheDocument();
    expect(issueGallery.getByRole("button", { name: "Collapse Todo" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(issueGallery.getByText("Todo")).toBeInTheDocument();
    expect(issueGalleryElement.querySelectorAll(".trail-project-workspace-page__status-section"))
      .toHaveLength(2);
    expect(issueGalleryElement.querySelector(".trail-project-workspace-page__status-section[data-empty='true']"))
      .not.toBeNull();

    const projectGallery = within(screen.getByRole("group", { name: "Project summary rows" }));
    expect(projectGallery.getByRole("button", { name: "Collapse Initiative Alpha" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(projectGallery.getByRole("button", { name: "Initiative Alpha" })).toBeInTheDocument();
    expect(projectGallery.queryByRole("group", { name: "Group header" })).not.toBeInTheDocument();
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
    expect(container.querySelectorAll("[data-project-summary-row='true']"))
      .toHaveLength(4);
    expect(projectGallery.getByRole("checkbox", { name: "Deselect Rebuild the Projects scanning hierarchy" }))
      .toBeChecked();
    expect(container.querySelectorAll(".trail-project-summary-row__status"))
      .toHaveLength(0);
  });
});
