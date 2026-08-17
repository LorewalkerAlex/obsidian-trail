import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TrailAlertDialog,
  TrailAlertDialogAction,
  TrailAlertDialogCancel,
  TrailDialog,
  TrailDialogClose,
} from "./trail-dialog";

describe("Trail dialog primitives", () => {
  it("provides modal semantics and closes an input dialog with Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <TrailDialog
        description="Provide a value before continuing."
        onOpenChange={onOpenChange}
        open
        title="Input required"
      >
        <input aria-label="Required value" />
      </TrailDialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Input required" });
    expect(dialog).toHaveAccessibleDescription("Provide a value before continuing.");
    await waitFor(() => expect(screen.getByLabelText("Required value")).toHaveFocus());

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses AlertDialog semantics and keeps Cancel as the safe initial focus", async () => {
    const onConfirm = vi.fn();
    render(
      <TrailAlertDialog
        description="This removes the captured item from Triage."
        title="Delete Triage Issue?"
        trigger={<button type="button">Delete</button>}
      >
        <TrailAlertDialogCancel>
          <button type="button">Cancel</button>
        </TrailAlertDialogCancel>
        <TrailAlertDialogAction>
          <button onClick={onConfirm} type="button">Confirm delete</button>
        </TrailAlertDialogAction>
      </TrailAlertDialog>,
    );

    const trigger = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete Triage Issue?" });
    expect(dialog).toHaveAccessibleDescription("This removes the captured item from Triage.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("lets a shared Close control dismiss a triggered dialog", async () => {
    render(
      <TrailDialog
        description="Inspect lightweight information without losing context."
        title="Peek"
        trigger={<button type="button">Open peek</button>}
      >
        <TrailDialogClose>
          <button type="button">Close</button>
        </TrailDialogClose>
      </TrailDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open peek" }));
    expect(screen.getByRole("dialog", { name: "Peek" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
