import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { TrailStatusPicker } from "./trail-status-picker";

describe("TrailStatusPicker", () => {
  it("renders only the configured entity StatusDefinitions and reports the selected identity", () => {
    const onChange = vi.fn();
    render(
      <TrailStatusPicker
        ariaLabel="Project status"
        configuration={createTrailTestConfiguration()}
        disabled={false}
        entityType="project"
        onChange={onChange}
        value="project-unstarted"
      />,
    );

    const picker = screen.getByLabelText("Project status");
    expect(picker).toHaveValue("project-unstarted");
    expect(screen.getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "project-backlog",
      "project-unstarted",
      "project-started",
      "project-completed",
      "project-canceled",
    ]);

    fireEvent.change(picker, { target: { value: "project-started" } });
    expect(onChange).toHaveBeenCalledWith("project-started");
  });
});
