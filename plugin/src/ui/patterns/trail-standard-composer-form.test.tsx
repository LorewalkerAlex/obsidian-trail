import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailPropertyControl } from "./trail-property-control";
import {
  TrailStandardComposerEditor,
  TrailStandardComposerForm,
  TrailStandardComposerProperties,
  TrailStandardComposerRelation,
} from "./trail-standard-composer-form";

describe("TrailStandardComposerForm", () => {
  it("keeps structural relations separate from optional metadata", () => {
    const { container } = render(
      <TrailStandardComposerForm>
        <TrailStandardComposerEditor>
          <input aria-label="Title specimen" />
          <textarea aria-label="Description specimen" />
        </TrailStandardComposerEditor>
        <TrailStandardComposerRelation label="Project" required>
          <TrailPropertyControl aria-label="Project: Standalone">Standalone</TrailPropertyControl>
        </TrailStandardComposerRelation>
        <TrailStandardComposerProperties label="Issue optional properties">
          <TrailPropertyControl>Priority</TrailPropertyControl>
          <TrailPropertyControl>Labels</TrailPropertyControl>
        </TrailStandardComposerProperties>
      </TrailStandardComposerForm>,
    );

    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project: Standalone" })).toHaveTextContent("Standalone");
    expect(screen.getByRole("group", { name: "Issue optional properties" })).toBeInTheDocument();

    const form = container.querySelector(".trail-standard-composer-form");
    expect(form).not.toBeNull();
    expect(form?.children[0]).toHaveClass("trail-standard-composer-form__editor");
    expect(form?.children[1]).toHaveClass("trail-standard-composer-form__relation");
    expect(form?.children[1]).toHaveAttribute("data-required", "true");
    expect(form?.children[2]).toHaveClass("trail-standard-composer-form__properties");
  });
});
