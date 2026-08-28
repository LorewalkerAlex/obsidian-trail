import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailNavigationStore } from "./trail-navigation-state";
import { TrailNavigation } from "./trail-navigation";

describe("TrailNavigation foundation lab", () => {
  it("uses the host navigation carrier as a Linear-style calibration context", () => {
    render(
      <TrailNavigation
        navigationStore={createTrailNavigationStore()}
        onNavigate={() => undefined}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Trail navigation" })).toBeInTheDocument();
    expect(screen.getByText("Foundation lab")).toBeInTheDocument();
    expect(screen.getByText("Linear dark · 2026 refresh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search calibration specimen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create calibration specimen" })).toBeInTheDocument();
  });
});
