import { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailTask } from "./domain/trail-model";
import {
  TrailTaskTitleEditor,
  type TrailTaskTitleEditorHandle,
} from "./trail-task-title-editor";

const task: TrailTask = {
  id: "8c774a86-54aa-48d3-9010-99372d0738fc",
  projectId: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
  projectPath: "Trail/Areas/Work/Title Lab.md",
  title: "Original title",
  status: "todo",
  priority: "medium",
  created: "2026-08-07T09:00:00+08:00",
  labels: [],
  subtasks: [],
  notes: [],
  source: {
    filePath: "Trail/Areas/Work/Title Lab.md",
    startOffset: 100,
    endOffset: 220,
    fingerprint: "task-fingerprint",
  },
};

describe("Trail Task title editor", () => {
  it("protects a dirty draft on Cancel", () => {
    const onClose = vi.fn();
    render(
      <TrailTaskTitleEditor
        task={task}
        onSave={() => Promise.resolve()}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Draft title" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", {
      name: "Unsaved Task title",
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Task title")).toHaveValue("Draft title");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses the same dirty guard for a host close request", () => {
    const onClose = vi.fn();
    const ref = createRef<TrailTaskTitleEditorHandle>();
    render(
      <TrailTaskTitleEditor
        ref={ref}
        task={task}
        onSave={() => Promise.resolve()}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Host close draft" },
    });
    act(() => ref.current?.requestClose());

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Discard unsaved Task title changes?"))
      .toBeInTheDocument();
  });

  it("prevents duplicate saves while pending", async () => {
    let resolveSave: (() => void) | undefined;
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onSave = vi.fn(() => pendingSave);
    const onClose = vi.fn();
    render(
      <TrailTaskTitleEditor
        task={task}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Saved title" },
    });
    const saveButton = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Saving..." }));
    expect(onSave).toHaveBeenCalledOnce();

    if (!resolveSave) {
      throw new Error("Save did not start.");
    }
    resolveSave();

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("retains the draft after a failed save and can retry", async () => {
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error("The task changed after it was read."))
      .mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    render(
      <TrailTaskTitleEditor
        task={task}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText("Task title"), {
      target: { value: "Conflict draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Task update failed: The task changed after it was read.",
    );
    expect(screen.getByLabelText("Task title")).toHaveValue("Conflict draft");
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
