import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailButton } from "../primitives/trail-button";
import { TrailConfirmation } from "./trail-confirmation";

function renderConfirmation(onConfirm = vi.fn()) {
  render(
    <TrailConfirmation
      confirmLabel="Delete"
      description="This permanently removes the entry. Trail does not provide undo."
      onConfirm={onConfirm}
      title="Delete this entry?"
      tone="danger"
      trigger={<TrailButton>Open confirmation</TrailButton>}
    />,
  );
  return onConfirm;
}

describe("TrailConfirmation", () => {
  it("opens with the safe Cancel action focused and confirms only by explicit activation", async () => {
    const onConfirm = renderConfirmation();
    const trigger = screen.getByRole("button", { name: "Open confirmation" });

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Delete this entry?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete this entry?" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("treats Escape as Cancel and restores focus without running the guarded action", async () => {
    const onConfirm = renderConfirmation();
    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Delete this entry?" });

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete this entry?" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("treats the backdrop as Cancel without running the guarded action", async () => {
    const onConfirm = renderConfirmation();
    const trigger = screen.getByRole("button", { name: "Open confirmation" });
    fireEvent.click(trigger);
    const backdrop = document.querySelector("[data-confirmation-backdrop='true']");
    expect(backdrop).not.toBeNull();

    fireEvent.pointerDown(backdrop as Element);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete this entry?" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
