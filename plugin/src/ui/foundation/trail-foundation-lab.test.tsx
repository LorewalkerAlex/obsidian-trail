import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab", () => {
  it("renders the Linear reference seed and calibration specimens", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={7} />);

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Linear 2026 color seed" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overlays and composer" })).toBeInTheDocument();
    expect(screen.getByText("#0E1012")).toBeInTheDocument();
    expect(screen.getByText("#5E6AD2")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("r7")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create issue" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByText("Reset legacy presentation")).toBeInTheDocument();
  });
});
