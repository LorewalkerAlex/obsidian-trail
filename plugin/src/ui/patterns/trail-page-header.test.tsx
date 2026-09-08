import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailPageHeader } from "./trail-page-header";

describe("TrailPageHeader", () => {
  it("owns shared Page identity and action geometry without inventing Page semantics", () => {
    const { container } = render(
      <TrailPageHeader
        actions={<button type="button">Add project</button>}
        title="Projects"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Projects" }))
      .toHaveClass("trail-page-header__title");
    expect(screen.getByRole("button", { name: "Add project" })).toBeInTheDocument();
    expect(container.querySelector(".trail-page-header"))
      .not.toHaveAttribute("data-has-breadcrumb");
  });

  it("renders Page-supplied ancestry as an optional lower-emphasis region", () => {
    const { container } = render(
      <TrailPageHeader breadcrumb={<button type="button">Projects</button>} title="Initiative Alpha" />,
    );

    expect(screen.getByRole("button", { name: "Projects" }))
      .toBeInTheDocument();
    expect(container.querySelector(".trail-page-header"))
      .toHaveAttribute("data-has-breadcrumb", "true");
  });
});
