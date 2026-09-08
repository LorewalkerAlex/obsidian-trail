import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { selectTrailStatusOptionGroups } from "../../query/shared/trail-status-query";
import { TrailStatusPropertySelect } from "./trail-status-property-select";

describe("TrailStatusPropertySelect", () => {
  it("renders configured Project Status options and emits the selected definition", () => {
    const configuration = createTrailTestConfiguration();
    const onValueChange = vi.fn();
    render(
      <TrailStatusPropertySelect
        category="started"
        entityType="project"
        label="started"
        onValueChange={onValueChange}
        options={selectTrailStatusOptionGroups(configuration, "project")}
        value="project-started"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: started" }));
    fireEvent.click(screen.getByRole("button", { name: "completed" }));
    expect(onValueChange).toHaveBeenCalledWith("project-completed");
  });
});
