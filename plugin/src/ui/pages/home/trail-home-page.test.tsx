import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { createTrailTestRuntimeStore } from "../../../test/trail-runtime-test-harness";
import { TrailHomePage } from "./trail-home-page";

describe("TrailHomePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 8, 14, 8)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Page identity available before Configuration is readable", () => {
    render(<TrailHomePage runtimeStore={createTrailRuntimeStore()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "This week" })).not.toBeInTheDocument();
  });

  it("consumes the production temporal widgets from the real Home Read Model", () => {
    const { container } = render(
      <TrailHomePage runtimeStore={createTrailTestRuntimeStore()} />,
    );

    const thisWeek = screen.getByRole("region", { name: "This week" });
    const lifecycle = screen.getByRole("region", { name: "Lifecycle activity" });
    const workTrend = screen.getByRole("region", { name: "Work trend" });

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(thisWeek).toHaveAttribute("data-home-widget-size", "compact");
    expect(lifecycle).toHaveAttribute("data-home-widget-size", "banner");
    expect(workTrend).toHaveAttribute("data-home-widget-size", "wide");
    expect(within(thisWeek).getByText("Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("Jul–Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("No workflow history yet")).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="this-week"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="lifecycle"]')).toBeInTheDocument();
    expect(container.querySelector('[data-home-slot="work-trend"]')).toBeInTheDocument();
  });
});
