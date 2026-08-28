import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailNavigationStore } from "./trail-navigation-state";
import { TrailNavigation } from "./trail-navigation";

describe("TrailNavigation foundation scaffold", () => {
  it("keeps the host navigation carrier without legacy navigation controls", () => {
    render(
      <TrailNavigation
        navigationStore={createTrailNavigationStore()}
        onNavigate={() => undefined}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Trail navigation" })).toBeInTheDocument();
    expect(screen.getByText("Interface foundation")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
