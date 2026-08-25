import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { addTrailCalendarDays } from "../../../domain/rules/trail-temporal-rules";
import { createTrailUiTestHarness } from "../../../test/trail-ui-test-harness";
import { TrailTriagePage } from "./trail-triage-page";

describe("TrailTriagePage", () => {
  it("preselects the legal Default Project before accepting Triage into Workflow", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    const project = screen.getByRole("combobox", { name: "Accept into Workflow" });
    expect(project).toHaveValue(harness.project.id);
    expect(screen.getByRole("button", { name: "Accept" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(harness.actions.triage.accept).toHaveBeenCalledWith(harness.triage, harness.project.id);
  });

  it("requires an explicit legal Project when no Default Project is configured", () => {
    const harness = createTrailUiTestHarness({ defaultProjectId: null });
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    const project = screen.getByRole("combobox", { name: "Accept into Workflow" });
    expect(project).toHaveValue("");
    expect(screen.getByRole("option", { name: "Select Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeDisabled();

    fireEvent.change(project, { target: { value: harness.projectB.id } });
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(harness.actions.triage.accept).toHaveBeenCalledWith(harness.triage, harness.projectB.id);
  });

  it("does not preselect or offer a terminal Default Project for non-terminal Triage Accept", () => {
    const harness = createTrailUiTestHarness({ projectStatusDefinitionId: "project-completed" });
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    const project = screen.getByRole("combobox", { name: "Accept into Workflow" });
    expect(project).toHaveValue("");
    expect(screen.queryByRole("option", { name: harness.project.title })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: harness.projectB.title })).toBeInTheDocument();
  });

  it("maps Defer to seven configured-zone calendar days", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Defer 7 days" }));
    expect(harness.actions.triage.defer).toHaveBeenCalledWith(
      harness.triage,
      addTrailCalendarDays(harness.triage.due, "Asia/Singapore", 7),
    );
  });

  it("maps Convert to project directly to the Triage application action", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Convert to project" }));
    expect(harness.actions.triage.convertToProject).toHaveBeenCalledWith(harness.triage);
  });

  it("keeps edit drafts local until Save", () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const title = screen.getByDisplayValue("Captured");
    fireEvent.change(title, { target: { value: "Refined" } });
    expect(harness.actions.triage.edit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(harness.actions.triage.edit).toHaveBeenCalledWith(
      harness.triage,
      expect.objectContaining({ title: "Refined" }),
    );
  });

  it("keeps destructive confirmation open when Application rejects synchronously", async () => {
    const harness = createTrailUiTestHarness();
    harness.actions.triage.delete = vi.fn(() => {
      throw new Error("Delete blocked");
    });
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(harness.actions.triage.delete).toHaveBeenCalledWith(harness.triage);
    const dialog = screen.getByRole("alertdialog", { name: "Delete Triage Issue?" });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("Delete blocked"));
  });

  it("confirms deletion through the shared AlertDialog before invoking Application", async () => {
    const harness = createTrailUiTestHarness();
    render(
      <TrailTriagePage
        actions={harness.actions.triage}
        runtimeStore={harness.runtimeStore}
        timezone="Asia/Singapore"
        writable
      />,
    );

    const trigger = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("alertdialog", { name: "Delete Triage Issue?" });
    expect(dialog).toHaveAccessibleDescription("This removes the captured item from Triage.");
    expect(harness.actions.triage.delete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(harness.actions.triage.delete).toHaveBeenCalledWith(harness.triage);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });
});
