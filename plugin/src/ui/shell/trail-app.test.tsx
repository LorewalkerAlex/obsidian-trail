import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";
import { TrailApp } from "./trail-app";

describe("TrailApp foundation lab", () => {
  it("mounts the visual calibration surface on the reset shell", () => {
    render(
      <TrailApp
        actions={{} as TrailUiActions}
        navigationStore={createTrailNavigationStore()}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expect(screen.getByText("Loading")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Controls" })).toBeInTheDocument();
  }, 15_000);
});
