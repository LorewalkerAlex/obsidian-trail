import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectPatternSpecimens } from "./trail-project-pattern-specimens";

describe("TrailProjectPatternSpecimens", () => {
  it("shows minimum-complete Group Header and Empty State project fixtures", () => {
    const { container } = render(<TrailProjectPatternSpecimens />);

    const groupHeaderGallery = within(screen.getByRole("group", { name: "Group header" }));
    expect(groupHeaderGallery.getByRole("button", { name: "Collapse Initiative Alpha" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(groupHeaderGallery.getByRole("button", { name: "Initiative Alpha" }))
      .toBeInTheDocument();
    expect(groupHeaderGallery.getByRole("button", { name: "Expand No Initiative" }))
      .toHaveAttribute("aria-expanded", "false");
    expect(groupHeaderGallery.queryByRole("button", { name: "No Initiative" }))
      .not.toBeInTheDocument();

    const emptyStateGallery = within(screen.getByRole("group", { name: "Empty state" }));
    expect(emptyStateGallery.getByText("No projects yet")).toHaveClass("trail-empty-state__title");
    expect(emptyStateGallery.getByText("Create a project to collect durable work under a shared outcome."))
      .toHaveClass("trail-empty-state__description");
    expect(emptyStateGallery.getByRole("button", { name: "New project" }))
      .toHaveClass("trail-button--primary");
    expect(emptyStateGallery.getByText("No projects match the filters."))
      .toHaveClass("trail-empty-state__title");
    expect(emptyStateGallery.getByRole("button", { name: "Clear filters" }))
      .toHaveClass("trail-button");
    expect(container.querySelectorAll(".trail-empty-state")).toHaveLength(2);
  });
});
