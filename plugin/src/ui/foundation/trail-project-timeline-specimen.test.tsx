import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectTimelineSpecimen } from "./trail-project-timeline-specimen";

describe("TrailProjectTimelineSpecimen", () => {
  it("shows orthogonal Timeline evidence without deriving schedule semantics in Foundation", () => {
    const { container } = render(<TrailProjectTimelineSpecimen />);
    const specimen = within(screen.getByRole("group", { name: "Project timeline" }));

    expect(specimen.getByText("Representative month scale")).toBeInTheDocument();
    expect(specimen.getByText("Constrained viewport · Timeline scroll owner"))
      .toBeInTheDocument();
    expect(specimen.getAllByText("Ship the Projects workspace")).toHaveLength(2);
    expect(specimen.getAllByRole("img", { name: "Issue due Aug 28 · overdue" }))
      .toHaveLength(2);
    expect(container.querySelectorAll("[data-span-kind='execution']")).toHaveLength(2);
    expect(container.querySelectorAll("[data-span-kind='planning']")).toHaveLength(4);
    expect(container.querySelectorAll("[data-span-kind='future']")).toHaveLength(4);
    expect(container.querySelectorAll("[data-timeline-constraint='true']"))
      .toHaveLength(1);
  });
});
