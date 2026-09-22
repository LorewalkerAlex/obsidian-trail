import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { TrailQuickCapture } from "./trail-quick-capture";

const defaultDue = Date.parse("2026-09-24T15:59:59.999Z");

describe("TrailQuickCapture", () => {
  it("expands a user-authored title into the standard Triage Composer without creating", async () => {
    const onCreate = vi.fn(async () => undefined);
    const onDismiss = vi.fn();

    render(
      <TrailQuickCapture
        configuration={createTrailTestConfiguration()}
        defaultDue={defaultDue}
        onCreate={onCreate}
        onDismiss={onDismiss}
      />,
    );

    const quickTitle = screen.getByRole("textbox", { name: "Quick Capture title" });
    await waitFor(() => expect(quickTitle).toHaveFocus());

    fireEvent.keyDown(quickTitle, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "Capture to Triage" })).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.change(quickTitle, { target: { value: "Review launch notes" } });
    fireEvent.keyDown(quickTitle, { key: "Enter" });

    const triageTitle = await screen.findByRole("textbox", { name: "Triage title" });
    expect(triageTitle).toHaveValue("Review launch notes");
    expect(onCreate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close composer" }));
    expect(screen.getByRole("dialog", { name: "Discard changes?" })).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("creates through the ordinary Triage contract after expansion", async () => {
    const onCreate = vi.fn(async () => undefined);
    const onDismiss = vi.fn();

    render(
      <TrailQuickCapture
        configuration={createTrailTestConfiguration()}
        defaultDue={defaultDue}
        onCreate={onCreate}
        onDismiss={onDismiss}
      />,
    );

    const quickTitle = screen.getByRole("textbox", { name: "Quick Capture title" });
    fireEvent.change(quickTitle, { target: { value: "Review launch notes" } });
    fireEvent.keyDown(quickTitle, { key: "Enter" });

    fireEvent.click(await screen.findByRole("button", { name: "Create" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      description: "",
      due: defaultDue,
      labelIds: [],
      priority: undefined,
      title: "Review launch notes",
    }));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });
});
