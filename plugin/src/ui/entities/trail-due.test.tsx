import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailDueDate } from "./trail-due";

describe("TrailDueDate", () => {
  it("presents one compact date in the configured timezone with precise accessible text", () => {
    render(
      <TrailDueDate
        timestamp={Date.UTC(2026, 8, 2, 16)}
        timezone="Asia/Singapore"
      />,
    );

    const due = screen.getByText("Sep 3");
    expect(due).toHaveAttribute("aria-label", "September 3, 2026");
    expect(due).toHaveAttribute("datetime", "2026-09-02T16:00:00.000Z");
    expect(due).toHaveAttribute("title", "September 3, 2026");
  });
});
