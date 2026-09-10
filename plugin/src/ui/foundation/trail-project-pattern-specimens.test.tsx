import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailProjectPatternSpecimens } from "./trail-project-pattern-specimens";

describe("TrailProjectPatternSpecimens", () => {
  it("shows minimum-complete Page, collection, and Issue action pattern fixtures", async () => {
    const { container } = render(<TrailProjectPatternSpecimens />);

    const pageHeaderGallery = within(screen.getByRole("group", { name: "Page header" }));
    expect(pageHeaderGallery.getByRole("heading", { level: 1, name: "Projects" }))
      .toHaveClass("trail-page-header__title");
    expect(pageHeaderGallery.getByRole("button", { name: "Add project" }))
      .toBeInTheDocument();
    expect(pageHeaderGallery.getByRole("heading", { level: 1, name: "Initiative Alpha" }))
      .toHaveClass("trail-page-header__title");
    expect(pageHeaderGallery.getByRole("button", { name: "Projects" }))
      .toHaveClass("trail-page-header__breadcrumb-button");
    expect(pageHeaderGallery.getByRole("button", { name: "Add initiative project" }))
      .toBeInTheDocument();

    const narrativeGallery = within(screen.getByRole("group", { name: "Page narrative" }));
    expect(await narrativeGallery.findByText("shared context"))
      .toHaveAttribute("href", "#");
    expect(narrativeGallery.getByText(/Keep the Initiative focused around/))
      .toBeInTheDocument();
    expect(container.querySelectorAll("[data-trail-page-narrative='true']"))
      .toHaveLength(1);

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

    const actionGallery = within(screen.getByRole("group", { name: "Issue action surfaces" }));
    expect(actionGallery.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("3 selected");
    expect(actionGallery.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(actionGallery.getByRole("button", { name: "More selection actions" }))
      .toBeInTheDocument();
    expect(actionGallery.getByRole("button", { name: "Clear selection" }))
      .toBeInTheDocument();
    expect(actionGallery.getByRole("button", { name: "More issue actions" }))
      .toBeInTheDocument();
  });
});
