import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailOptionalDuePropertySelect } from "./trail-optional-due-property-select";

const referenceTimestamp = Date.parse("2026-09-08T04:00:00.000Z");

describe("TrailOptionalDuePropertySelect", () => {
  it("uses the shared PropertyControl grammar and can clear an existing Due value", () => {
    const onValueChange = vi.fn();
    render(
      <TrailOptionalDuePropertySelect
        onValueChange={onValueChange}
        referenceTimestamp={referenceTimestamp}
        timezone="Asia/Singapore"
        value={Date.parse("2026-09-18T04:00:00.000Z")}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Due: Set" });
    expect(trigger).toHaveClass("trail-property-control");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "No due" }));

    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it("keeps modal-child layering available for standard Composer consumers", () => {
    render(
      <TrailOptionalDuePropertySelect
        layer="modal-child"
        onValueChange={vi.fn()}
        referenceTimestamp={referenceTimestamp}
        timezone="Asia/Singapore"
        value={undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Due: No due" }));

    expect(screen.getByRole("dialog", { name: "Due" }))
      .toHaveAttribute("data-trail-transient-layer", "modal-child");
  });
});
