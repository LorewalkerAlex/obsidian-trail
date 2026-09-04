import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TrailPageSurface,
  TrailWorkspaceFrame,
} from "./trail-workspace-shell";

describe("TrailWorkspaceFrame", () => {
  it("provides mechanical page capacity without mandatory location chrome", () => {
    const { container } = render(
      <TrailWorkspaceFrame>
        <TrailPageSurface inset="page" scroll="page">
          <section aria-label="Page content">Content</section>
        </TrailPageSurface>
      </TrailWorkspaceFrame>,
    );

    const frame = container.querySelector<HTMLElement>(".trail-workspace-frame");
    const surface = container.querySelector<HTMLElement>(".trail-page-surface");

    expect(frame).not.toBeNull();
    expect(surface).not.toBeNull();
    expect(frame).toContainElement(surface);
    expect(surface).toHaveAttribute("data-inset", "page");
    expect(surface).toHaveAttribute("data-scroll", "page");
    expect(screen.getByRole("region", { name: "Page content" })).toHaveTextContent("Content");
    expect(screen.queryByRole("banner", { name: "Location" })).not.toBeInTheDocument();
  });

  it("defaults to a nested-scroll surface with no shared inset", () => {
    const { container } = render(
      <TrailWorkspaceFrame>
        <TrailPageSurface>Content</TrailPageSurface>
      </TrailWorkspaceFrame>,
    );

    const surface = container.querySelector<HTMLElement>(".trail-page-surface");
    expect(surface).toHaveAttribute("data-inset", "none");
    expect(surface).toHaveAttribute("data-scroll", "nested");
  });
});
