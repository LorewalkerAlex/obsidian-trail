import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab", () => {
  it("renders token-driven calibration specimens without presenting production primitives", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={7} />);

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visual token roles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overlays and composer" })).toBeInTheDocument();
    expect(screen.getByText("Canvas")).toBeInTheDocument();
    expect(screen.getByText("Accent")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("r7")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create issue" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByText("Reset legacy presentation")).toBeInTheDocument();
    expect(screen.queryByText(/^#[0-9A-Fa-f]{6}$/)).not.toBeInTheDocument();
  });
});
