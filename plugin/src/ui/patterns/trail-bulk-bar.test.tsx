import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailButton } from "../primitives/trail-button";
import { TrailBulkBar } from "./trail-bulk-bar";

describe("TrailBulkBar", () => {
  it("presents collection selection count, shared action slots, overflow, and clear mechanics", () => {
    const onClear = vi.fn();
    const onOverflow = vi.fn();
    render(
      <TrailBulkBar
        actions={<TrailButton>Cancel</TrailButton>}
        count={3}
        onClear={onClear}
        onOverflow={onOverflow}
      />,
    );

    expect(screen.getByRole("toolbar", { name: "Selection actions" }))
      .toHaveTextContent("3 selected");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More selection actions" }));
    expect(onOverflow).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
