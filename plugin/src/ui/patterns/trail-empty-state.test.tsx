import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailEmptyState } from "./trail-empty-state";

describe("TrailEmptyState", () => {
  it("presents page-supplied hierarchy and recovery without owning empty-state semantics", () => {
    render(
      <TrailEmptyState
        action={<button type="button">New project</button>}
        description="Projects collect durable work under a shared outcome."
        title="No projects yet"
      />,
    );

    expect(screen.getByText("No projects yet")).toHaveClass("trail-empty-state__title");
    expect(screen.getByText("Projects collect durable work under a shared outcome."))
      .toHaveClass("trail-empty-state__description");
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
  });

  it("allows compact guidance without forcing description or CTA", () => {
    render(<TrailEmptyState title="There is nothing to show here." />);

    expect(screen.getByText("There is nothing to show here.")).toBeInTheDocument();
    expect(document.querySelector(".trail-empty-state__description")).toBeNull();
    expect(document.querySelector(".trail-empty-state__action")).toBeNull();
  });
});
