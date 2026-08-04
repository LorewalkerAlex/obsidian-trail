import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailApp } from "./trail-app";

describe("TrailApp", () => {
  it("renders the four top-level page controls", () => {
    render(<TrailApp />);

    expect(
      screen.getByRole("button", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Areas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Project" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fleeting Notes" }),
    ).toBeInTheDocument();
  });

  it("switches the active page", () => {
    render(<TrailApp />);

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Areas" }),
    );

    expect(
      screen.getByRole("heading", { name: "Areas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A future view of areas and their projects.",
      ),
    ).toBeInTheDocument();
  });
});
