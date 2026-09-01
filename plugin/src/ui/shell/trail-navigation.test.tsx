import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createTrailNavigationStore } from "./trail-navigation-state";
import { TrailNavigation } from "./trail-navigation";

describe("TrailNavigation", () => {
  it("routes the production Triage entry through the host navigation callback", () => {
    const navigationStore = createTrailNavigationStore();
    const onNavigate = vi.fn();
    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Trail navigation" })).toBeInTheDocument();
    expect(screen.getByText("Trail")).toBeInTheDocument();
    const triage = screen.getByRole("button", { name: "Triage" });
    expect(triage).not.toHaveAttribute("aria-current");

    fireEvent.click(triage);
    expect(onNavigate).toHaveBeenCalledWith({ kind: "triage" });
  });

  it("reflects the shared navigation location without changing the canonical initial Home location", () => {
    const navigationStore = createTrailNavigationStore();
    render(
      <TrailNavigation
        navigationStore={navigationStore}
        onNavigate={() => undefined}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    act(() => {
      navigationStore.getState().navigate({ kind: "triage" });
    });

    expect(screen.getByRole("button", { name: "Triage" })).toHaveAttribute("aria-current", "page");
  });
});
