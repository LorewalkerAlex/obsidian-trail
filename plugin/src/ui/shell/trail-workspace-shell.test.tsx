import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  TrailLocationBar,
  TrailWorkspaceShell,
} from "./trail-workspace-shell";

describe("TrailWorkspaceShell", () => {
  it("keeps shared location chrome outside page content", () => {
    render(
      <TrailWorkspaceShell locationBar={<TrailLocationBar title="Triage" />}>
        <section aria-label="Queue">Queue content</section>
      </TrailWorkspaceShell>,
    );

    expect(screen.getByRole("banner", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Triage" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Queue" })).toHaveTextContent("Queue content");
  });
});
