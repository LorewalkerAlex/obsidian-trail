import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailRelationPropertySelect } from "./trail-relation-property-select";

describe("TrailRelationPropertySelect", () => {
  it("presents the current relation and emits an explicit optional target", () => {
    const onValueChange = vi.fn();
    render(
      <TrailRelationPropertySelect
        label="Initiative"
        noneLabel="No initiative"
        onValueChange={onValueChange}
        options={[
          { id: "initiative-a", title: "Initiative A" },
          { id: "initiative-b", title: "Initiative B" },
        ]}
        value="initiative-a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Initiative: Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Initiative B" }));
    expect(onValueChange).toHaveBeenCalledWith("initiative-b");
  });

  it("supports required searchable relations without exposing an empty target", () => {
    const onValueChange = vi.fn();
    render(
      <TrailRelationPropertySelect
        label="Project"
        noneLabel="Choose project"
        onValueChange={onValueChange}
        options={[
          { id: "project-a", title: "Atlas" },
          { id: "project-b", title: "Beacon" },
        ]}
        required
        searchable
        value="project-a"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Project: Atlas" });
    expect(trigger).toHaveAttribute("aria-required", "true");
    fireEvent.click(trigger);

    const popover = screen.getByLabelText("Project");
    const search = within(popover).getByRole("searchbox", { name: "Search project" });
    fireEvent.change(search, { target: { value: "bea" } });
    expect(within(popover).queryByRole("button", { name: "Atlas" })).not.toBeInTheDocument();
    fireEvent.click(within(popover).getByRole("button", { name: "Beacon" }));
    expect(onValueChange).toHaveBeenCalledWith("project-b");
  });
});
