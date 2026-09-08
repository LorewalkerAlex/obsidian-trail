import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { TrailProjectComposer } from "./trail-standard-creation-composers";

const REFERENCE_TIMESTAMP = Date.parse("2026-09-12T04:00:00.000Z");

describe("TrailProjectComposer Initiative prefill", () => {
  it("treats invocation Initiative context as an editable clean baseline", async () => {
    const onOpenChange = vi.fn();

    render(
      <TrailProjectComposer
        configuration={createTrailTestConfiguration()}
        initialInitiativeId="initiative-a"
        initiatives={[
          { id: "initiative-a", title: "Initiative A" },
          { id: "initiative-b", title: "Initiative B" },
        ]}
        onCreate={vi.fn(async () => undefined)}
        onOpenChange={onOpenChange}
        open
        referenceTimestamp={REFERENCE_TIMESTAMP}
        seedTitle=""
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Project" });
    expect(within(dialog).getByRole("button", { name: "Initiative: Initiative A" }))
      .toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Initiative: Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Initiative B" }));
    expect(within(dialog).getByRole("button", { name: "Initiative: Initiative B" }))
      .toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Initiative: Initiative B" }));
    fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
  });
});
