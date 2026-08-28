import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";
import { TrailApp } from "./trail-app";

describe("TrailApp foundation scaffold", () => {
  it("renders only the neutral foundation surface", () => {
    render(
      <TrailApp
        actions={{} as TrailUiActions}
        navigationStore={createTrailNavigationStore()}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Interface foundation" })).toBeInTheDocument();
    expect(screen.getByText("Runtime: loading")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
