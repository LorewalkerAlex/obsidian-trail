import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("Trail Cycle Foundation specimen", () => {
  it("exercises the production Workflow Issue Row with Project context and no redundant Cycle track", () => {
    render(<TrailProjectProductionSpecimens />);

    const galleryElement = screen.getByRole("group", { name: "Cycle list issue rows" });
    const gallery = within(galleryElement);
    expect(gallery.getByText("Polish visual foundation")).toBeInTheDocument();
    expect(gallery.getByText("Refine navigation and search")).toBeInTheDocument();
    expect(gallery.queryByLabelText("In current cycle")).not.toBeInTheDocument();

    const rows = Array.from(galleryElement.querySelectorAll("[data-workflow-issue-row='true']"));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const content = row.querySelector(".trail-workflow-issue-row__content");
      const metadata = row.querySelector(".trail-workflow-issue-row__metadata");
      expect(content).toHaveClass("trail-workflow-issue-row__content--project");
      expect(content?.children[2]).toHaveClass("trail-workflow-issue-row__project");
      expect(row.querySelector(".trail-workflow-issue-row__project-icon")).not.toBeNull();
      expect(metadata?.children).toHaveLength(4);
      expect(metadata?.querySelector(".trail-workflow-issue-row__project")).toBeNull();
      expect(metadata?.querySelector(".trail-workflow-issue-row__cycle")).toBeNull();
    }
  });

  it("shows the production Current Cycle Board as Status columns over Project swimlanes", () => {
    render(<TrailProjectProductionSpecimens />);

    const galleryElement = screen.getByRole("group", { name: "Cycle board project swimlanes" });
    const gallery = within(galleryElement);
    const board = gallery.getByRole("region", { name: "Current cycle board" });

    expect(within(board).getByText("Todo")).toBeInTheDocument();
    expect(within(board).getByText("In Progress")).toBeInTheDocument();
    expect(within(board).getByText("Done")).toBeInTheDocument();
    expect(within(board).getByRole("region", {
      name: "Polish visual foundation project swimlane",
    })).toBeInTheDocument();
    expect(within(board).getByRole("region", {
      name: "Refine navigation and search project swimlane",
    })).toBeInTheDocument();
    expect(within(board).getByText("Build the Current Cycle read surface")).toBeInTheDocument();
    expect(within(board).getByText("Keep Project lanes readable across the Board")).toBeInTheDocument();
    expect(within(board).queryByLabelText("In current cycle")).not.toBeInTheDocument();
  });
});
