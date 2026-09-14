import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailWeeklyNoteSnapshot } from "../../../application/workspace/trail-weekly-note-application";
import type { TrailMarkdownRender } from "../../patterns/trail-markdown-content";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailWeeklyMeetingNotesWidget } from "./trail-weekly-meeting-notes-widget";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

const SNAPSHOT: TrailWeeklyNoteSnapshot = {
  archives: [
    { content: "Older archive", date: "2026-08-31" },
    { content: "Latest archive", date: "2026-09-07" },
  ],
  current: "Current planning notes",
};

function weeklyActions(input: {
  readonly archiveCurrent?: TrailUiActions["weeklyNote"]["archiveCurrent"];
  readonly load?: TrailUiActions["weeklyNote"]["load"];
  readonly replaceCurrent?: TrailUiActions["weeklyNote"]["replaceCurrent"];
} = {}): TrailUiActions["weeklyNote"] {
  return {
    archiveCurrent: input.archiveCurrent ?? vi.fn(async () => ({
      archives: [...SNAPSHOT.archives, { content: SNAPSHOT.current, date: "2026-09-14" }],
      current: "",
    })),
    load: input.load ?? vi.fn(async () => SNAPSHOT),
    replaceCurrent: input.replaceCurrent ?? vi.fn(async (_expectedCurrent: string, current: string) => ({
      ...SNAPSHOT,
      current,
    })),
  };
}

describe("TrailWeeklyMeetingNotesWidget", () => {
  it("loads Current by default and keeps History inside the module", async () => {
    render(
      <TrailWeeklyMeetingNotesWidget
        actions={weeklyActions()}
        renderMarkdown={renderMarkdown}
      />,
    );

    const region = screen.getByRole("region", { name: "Weekly meeting notes" });
    expect(region).toHaveAttribute("data-home-widget-size", "wide");
    expect(await within(region).findByText("Current planning notes")).toBeInTheDocument();

    fireEvent.click(within(region).getByRole("button", { name: "History" }));
    expect(within(region).getByRole("button", { name: "2026-09-07" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(within(region).getByText("Latest archive")).toBeInTheDocument();

    fireEvent.click(within(region).getByRole("button", { name: "2026-08-31" }));
    expect(within(region).getByText("Older archive")).toBeInTheDocument();
    fireEvent.click(within(region).getByRole("button", { name: "Current" }));
    expect(within(region).getByText("Current planning notes")).toBeInTheDocument();
  });

  it("uses a module-local edit draft and hides Archive / next while editing", async () => {
    const replaceCurrent = vi.fn(async (_expectedCurrent: string, current: string) => ({
      ...SNAPSHOT,
      current,
    }));
    render(
      <TrailWeeklyMeetingNotesWidget
        actions={weeklyActions({ replaceCurrent })}
        renderMarkdown={renderMarkdown}
      />,
    );

    const region = screen.getByRole("region", { name: "Weekly meeting notes" });
    await within(region).findByText("Current planning notes");
    fireEvent.click(within(region).getByRole("button", { name: "Edit" }));

    const editor = within(region).getByRole("textbox", { name: "Current weekly meeting notes" });
    fireEvent.change(editor, { target: { value: "Updated planning notes" } });
    expect(within(region).queryByRole("button", { name: "Archive / next" }))
      .not.toBeInTheDocument();

    fireEvent.click(within(region).getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(replaceCurrent).toHaveBeenCalledWith(
        "Current planning notes",
        "Updated planning notes",
      );
    });
    expect(await within(region).findByText("Updated planning notes")).toBeInTheDocument();
  });

  it("archives the loaded Current through the Application precondition and starts a quiet next Current", async () => {
    const archiveCurrent = vi.fn(async () => ({
      archives: [...SNAPSHOT.archives, { content: SNAPSHOT.current, date: "2026-09-14" }],
      current: "",
    }));
    render(
      <TrailWeeklyMeetingNotesWidget
        actions={weeklyActions({ archiveCurrent })}
        renderMarkdown={renderMarkdown}
      />,
    );

    const region = screen.getByRole("region", { name: "Weekly meeting notes" });
    await within(region).findByText("Current planning notes");
    fireEvent.click(within(region).getByRole("button", { name: "Archive / next" }));

    await waitFor(() => {
      expect(archiveCurrent).toHaveBeenCalledWith(
        "Current planning notes",
        "Current planning notes",
      );
    });
    expect(await within(region).findByText("No current notes yet.")).toBeInTheDocument();
  });

  it("keeps the edit draft open when persistence rejects a stale Current", async () => {
    const replaceCurrent = vi.fn(async () => {
      throw new Error("Weekly Note Current changed on disk. Reopen Home before saving.");
    });
    render(
      <TrailWeeklyMeetingNotesWidget
        actions={weeklyActions({ replaceCurrent })}
        renderMarkdown={renderMarkdown}
      />,
    );

    const region = screen.getByRole("region", { name: "Weekly meeting notes" });
    await within(region).findByText("Current planning notes");
    fireEvent.click(within(region).getByRole("button", { name: "Edit" }));
    fireEvent.change(
      within(region).getByRole("textbox", { name: "Current weekly meeting notes" }),
      { target: { value: "Local draft" } },
    );
    fireEvent.click(within(region).getByRole("button", { name: "Save" }));

    expect(await within(region).findByRole("alert"))
      .toHaveTextContent("Weekly Note Current changed on disk. Reopen Home before saving.");
    expect(within(region).getByRole("textbox", { name: "Current weekly meeting notes" }))
      .toHaveValue("Local draft");
    expect(within(region).queryByRole("button", { name: "Archive / next" }))
      .not.toBeInTheDocument();
  });
});
