import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { readTrailZonedDateTimeParts } from "../../domain/rules/trail-temporal-rules";
import {
  TrailDuePropertySelect,
  replaceTrailDueCalendarDate,
} from "./trail-due-property-select";
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

describe("TrailDuePropertySelect", () => {
  it("moves the calendar date while preserving local wall-clock time across DST", () => {
    const timezone = "America/New_York";
    const source = Date.UTC(2026, 2, 7, 20, 30);
    const moved = replaceTrailDueCalendarDate(source, timezone, {
      day: 8,
      month: 3,
      year: 2026,
    });

    expect(readTrailZonedDateTimeParts(source, timezone)).toMatchObject({
      day: 7,
      hour: 15,
      minute: 30,
      month: 3,
      year: 2026,
    });
    expect(readTrailZonedDateTimeParts(moved, timezone)).toMatchObject({
      day: 8,
      hour: 15,
      minute: 30,
      month: 3,
      year: 2026,
    });
  });

  it("uses the shared PropertyControl trigger for the editable Due identity", () => {
    render(
      <TrailDuePropertySelect
        onValueChange={vi.fn()}
        timezone="Asia/Singapore"
        value={Date.UTC(2026, 8, 2, 16)}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Review due" });
    expect(trigger).toHaveClass("trail-property-control");
    expect(trigger).toHaveTextContent("Sep 3");
  });
});
