import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  useRef,
  useState,
} from "react";
import { describe, expect, it, vi } from "vitest";

import { TrailInput } from "../primitives/trail-input";
import { TrailComposer } from "./trail-composer";

function ComposerHarness({
  onSubmit = vi.fn(),
}: {
  readonly onSubmit?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  return (
    <TrailComposer
      canSubmit={title.trim().length > 0}
      context="Issue · Project A"
      dirty={title !== ""}
      initialFocusRef={titleRef}
      onDismiss={() => setOpen(false)}
      onSubmit={onSubmit}
      open={open}
      submitLabel="Create"
    >
      <div className="trail-composer__fields">
        <TrailInput
          aria-label="Composer title"
          onChange={(event) => setTitle(event.currentTarget.value)}
          ref={titleRef}
          value={title}
        />
      </div>
    </TrailComposer>
  );
}

describe("TrailComposer", () => {
  it("focuses the requested field and reserves Ctrl/Cmd+Enter for submit", async () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);

    const title = screen.getByRole("textbox", { name: "Composer title" });
    await waitFor(() => expect(title).toHaveFocus());

    fireEvent.change(title, { target: { value: "Create me" } });
    fireEvent.keyDown(title, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(title, { ctrlKey: true, key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps a dirty draft behind the shared Discard confirmation and lets Escape affect only the top layer", async () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);

    const title = screen.getByRole("textbox", { name: "Composer title" });
    fireEvent.change(title, { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Close composer" }));

    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Issue · Project A" })).not.toBeInTheDocument();
    expect(document.querySelector(".trail-composer__content")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Discard changes?" }), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Issue · Project A" })).toBeInTheDocument();
      expect(title).toHaveValue("Keep this draft");
      expect(title).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close composer" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Issue · Project A" })).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Discard changes?" })).not.toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
