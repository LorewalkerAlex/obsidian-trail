import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectProductionSpecimens } from "./trail-project-production-specimens";

describe("Trail Project Board production specimen", () => {
  it("shows the production Board and Workflow Issue Card owners in Foundation", () => {
    render(<TrailProjectProductionSpecimens />);

    const specimen = screen.getByRole("group", { name: "Project issue board" });
    const board = within(specimen).getByRole("region", { name: "Foundation project issue board" });
    expect(board.querySelectorAll(".trail-board__column")).toHaveLength(3);
    expect(board.querySelectorAll("[data-workflow-issue-card='true']")).toHaveLength(3);
    expect(within(board).getByText("Build and calibrate the Project Board")).toBeInTheDocument();
    expect(within(board).getByRole("checkbox", { name: "Deselect Build and calibrate the Project Board" }))
      .toBeChecked();
    expect(within(board).getByRole("region", { name: "Done issues" })).toHaveTextContent("0");
  });
});
