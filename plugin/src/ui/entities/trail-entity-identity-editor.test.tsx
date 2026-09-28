import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailEntityIdentityEditor } from "./trail-entity-identity-editor";

describe("TrailEntityIdentityEditor", () => {
  it("edits title and description through an explicit save", async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn(() => Promise.resolve());
    render(
      <TrailEntityIdentityEditor
        context="Project"
        description="Original description"
        onOpenChange={onOpenChange}
        onSave={onSave}
        open
        title="Original title"
      />,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Project title" }), {
      target: { value: "  Revised title  " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project description" }), {
      target: { value: "Revised description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      description: "Revised description",
      title: "Revised title",
    }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps failed edits open with actionable feedback", async () => {
    render(
      <TrailEntityIdentityEditor
        context="Initiative"
        onOpenChange={vi.fn()}
        onSave={() => Promise.reject(new Error("write failed"))}
        open
        title="Initiative A"
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Initiative title" }), {
      target: { value: "Initiative B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed: write failed");
    expect(screen.getByRole("dialog", { name: "Edit initiative" })).toBeInTheDocument();
  });
});
