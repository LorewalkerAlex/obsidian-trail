import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailButton } from "../primitives/trail-button";
import {
  TrailConfirmation,
  TrailConfirmationSurface,
} from "./trail-confirmation";

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
  it("exposes the production confirmation content as an embeddable surface", () => {
    const { container } = render(
      <TrailConfirmationSurface
        actions={(
          <>
            <TrailButton>Cancel</TrailButton>
            <TrailButton data-confirmation-tone="danger">Delete</TrailButton>
          </>
        )}
        description="This permanently removes the entry. Trail does not provide undo."
        title="Delete this entry?"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Delete this entry?").closest(".trail-confirmation__surface")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
      "data-confirmation-tone",
      "danger",
    );
    expect(container.querySelector(".trail-confirmation__actions")).not.toBeNull();
  });

  it("opens with the safe Cancel action focused and confirms only by explicit activation", async () => {
    const onConfirm = renderConfirmation();
    const trigger = screen.getByRole("button", { name: "Open confirmation" });

    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Delete this entry?" });
    expect(dialog.querySelector(".trail-confirmation__surface")).not.toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete this entry?" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("supports one explicit destructive alternate action without redefining confirmation mechanics", () => {
    const onConfirm = vi.fn();
    const onAlternateConfirm = vi.fn();
    render(
      <TrailConfirmation
        alternateConfirm={{
          label: "Delete and archive",
          onConfirm: onAlternateConfirm,
          tone: "danger",
        }}
        confirmLabel="Delete"
        description="Choose one explicit destructive outcome."
        onConfirm={onConfirm}
        open
        title="Delete this entry?"
        tone="danger"
      />,
    );

    const alternate = screen.getByRole("button", { name: "Delete and archive" });
    expect(alternate).toHaveAttribute("data-confirmation-tone", "danger");
    fireEvent.click(alternate);
    expect(onAlternateConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps a neutral alternate action visually secondary to the guarded confirm", () => {
    render(
      <TrailConfirmation
        alternateConfirm={{
          label: "Plan another action",
          onConfirm: vi.fn(),
        }}
        confirmLabel="Delete"
        description="Choose whether to commit or continue planning."
        onConfirm={vi.fn()}
        open
        title="Delete this entry?"
        tone="danger"
      />,
    );

    const confirm = screen.getByRole("button", { name: "Delete" });
    const alternate = screen.getByRole("button", { name: "Plan another action" });
    expect(confirm).toHaveAttribute("data-confirmation-tone", "danger");
    expect(alternate).not.toHaveAttribute("data-confirmation-tone");
    expect(alternate).not.toHaveClass("trail-button--primary");
  });

  it("keeps the guarded action disabled until a composed workflow is ready", () => {
    const onConfirm = vi.fn();
    render(
      <TrailConfirmation
        confirmDisabled
        confirmLabel="Delete"
        description="Choose a replacement Project first."
        onConfirm={onConfirm}
        open
        title="Delete this project?"
        tone="danger"
      />,
    );

    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Delete this project?" })).toBeInTheDocument();
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
