import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { TrailCalendarDate } from "../../domain/rules/trail-temporal-rules";
import {
  formatTrailCalendarDateInput,
  parseTrailCalendarDateInput,
  TrailCalendarDatePicker,
} from "./trail-calendar-date-picker";

describe("TrailCalendarDatePicker", () => {
  it("moves the viewed month without changing or selecting the controlled date", () => {
    const onValueChange = vi.fn();
    const onDateSelect = vi.fn();

    render(
      <TrailCalendarDatePicker
        inputLabel="Date"
        onDateSelect={onDateSelect}
        onValueChange={onValueChange}
        value="2026-09-16"
      />,
    );

    expect(screen.getByText("September 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));

    expect(screen.getByText("August 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-09-16");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onDateSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "2026-08-20" }));
    expect(onValueChange).toHaveBeenCalledWith("2026-08-20");
    expect(onDateSelect).toHaveBeenCalledWith({ day: 20, month: 8, year: 2026 });
  });

  it("keeps text entry controlled and applies a valid ISO date when complete", () => {
    const onDateSelect = vi.fn();

    function Harness() {
      const [value, setValue] = useState("2026-09-16");
      return (
        <TrailCalendarDatePicker
          inputLabel="Date"
          onDateSelect={onDateSelect}
          onValueChange={setValue}
          value={value}
        />
      );
    }

    render(<Harness />);
    const input = screen.getByLabelText("Date");

    fireEvent.change(input, { target: { value: "2026-02-30" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onDateSelect).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "2026-02-28" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(onDateSelect).toHaveBeenCalledWith({ day: 28, month: 2, year: 2026 });
  });

  it("shares strict ISO calendar-date parsing and formatting", () => {
    const date: TrailCalendarDate = { day: 3, month: 9, year: 2026 };
    expect(formatTrailCalendarDateInput(date)).toBe("2026-09-03");
    expect(parseTrailCalendarDateInput("2026-09-03")).toEqual(date);
    expect(parseTrailCalendarDateInput("0000-01-01")).toBeUndefined();
    expect(parseTrailCalendarDateInput("2026-02-29")).toBeUndefined();
    expect(parseTrailCalendarDateInput("2028-02-29")).toEqual({ day: 29, month: 2, year: 2028 });
  });
});
