import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab", () => {
  it("calibrates accepted production primitives without promoting Lab-only specimens", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={7} />);

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visual token roles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overlays and composer" })).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.getByText("Accent")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("r7")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create issue" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Create issue" })[0]).toHaveClass("trail-button--primary");
    expect(screen.getByRole("button", { name: "Search specimen" })).toHaveClass("trail-icon-button");
    expect(screen.getByRole("searchbox", { name: "Search" })).toHaveClass("trail-input");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveClass("trail-textarea");
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("trail-lab-button--secondary");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("trail-lab-button--ghost");
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByText("Reset legacy presentation")).toBeInTheDocument();
    expect(screen.queryByText(/^#[0-9A-Fa-f]{6}$/)).not.toBeInTheDocument();
  });
});
