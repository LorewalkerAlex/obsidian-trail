import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailProjectTimeline } from "./trail-project-timeline";

const TODAY = Date.UTC(2026, 8, 12, 9);

const ROWS = [
  {
    dueMarkers: [
      {
        id: "issue-due",
        kind: "issue" as const,
        label: "Issue due August 28",
        overdue: true,
        timestamp: Date.UTC(2026, 7, 28),
      },
      {
        id: "project-due",
        kind: "project" as const,
        label: "Project due October 16",
        timestamp: Date.UTC(2026, 9, 16),
      },
    ],
    futureSpan: {
      end: Date.UTC(2026, 9, 16),
      start: TODAY,
    },
    historicalSpan: {
      end: TODAY,
      kind: "execution" as const,
      start: Date.UTC(2026, 6, 20),
    },
    id: "project-alpha",
    statusCategory: "started" as const,
    statusLabel: "In Progress",
    title: "Ship the Projects workspace",
  },
  {
    dueMarkers: [],
    historicalSpan: {
      end: Date.UTC(2026, 7, 24),
      kind: "planning" as const,
      start: Date.UTC(2026, 6, 8),
    },
    id: "project-beta",
    statusCategory: "completed" as const,
    statusLabel: "Completed",
    title: "Close the previous release",
  },
] as const;

describe("TrailProjectTimeline", () => {
  it("maps resolved projection spans and Due markers onto one read-oriented time canvas", () => {
    render(
      <TrailProjectTimeline
        label="Project timeline"
        rangeEnd={Date.UTC(2026, 11, 1)}
        rangeStart={Date.UTC(2026, 6, 1)}
        rows={ROWS}
        timezone="UTC"
        today={TODAY}
      />,
    );

    expect(screen.getByRole("region", {
      name: /Project timeline, July 1, 2026 to December 1, 2026/,
    })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Today, September 12, 2026" }))
      .toBeInTheDocument();

    const row = screen.getByRole("listitem", {
      name: "Ship the Projects workspace, In Progress",
    });
    expect(within(row).getByText("Ship the Projects workspace")).toBeInTheDocument();
    expect(row.querySelector("[data-span-kind='execution']")).not.toBeNull();
    expect(row.querySelector("[data-span-kind='future']")).not.toBeNull();
    expect(within(row).getByRole("img", { name: "Issue due August 28" }))
      .toHaveAttribute("data-overdue", "true");
    expect(within(row).getByRole("img", { name: "Project due October 16" }))
      .toHaveAttribute("data-due-kind", "project");

    const closedRow = screen.getByRole("listitem", {
      name: "Close the previous release, Completed",
    });
    expect(closedRow.querySelector("[data-span-kind='planning']")).not.toBeNull();
    expect(closedRow.querySelector("[data-span-kind='future']")).toBeNull();
  });

  it("keeps project activation explicit and separate from Timeline geometry", () => {
    const onProjectActivate = vi.fn();

    render(
      <TrailProjectTimeline
        label="Project timeline"
        onProjectActivate={onProjectActivate}
        rangeEnd={Date.UTC(2026, 11, 1)}
        rangeStart={Date.UTC(2026, 6, 1)}
        rows={ROWS}
        timezone="UTC"
        today={TODAY}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ship the Projects workspace" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-alpha");
  });

  it("anchors project identity to clipped visible evidence when a span begins before the viewport", () => {
    render(
      <TrailProjectTimeline
        label="Clipped project timeline"
        rangeEnd={Date.UTC(2026, 11, 1)}
        rangeStart={Date.UTC(2026, 6, 1)}
        rows={[{
          dueMarkers: [{
            id: "late-due",
            kind: "project",
            label: "Late due marker",
            timestamp: Date.UTC(2026, 9, 1),
          }],
          historicalSpan: {
            end: Date.UTC(2026, 7, 1),
            kind: "execution",
            start: Date.UTC(2026, 5, 1),
          },
          id: "project-clipped",
          statusCategory: "started",
          statusLabel: "In Progress",
          title: "Clipped execution",
        }]}
        timezone="UTC"
        today={TODAY}
      />,
    );

    expect(screen.getByText("Clipped execution").parentElement)
      .toHaveStyle({ left: "0%" });
  });

  it("maps timestamps through the supplied Workspace timezone before positioning dates", () => {
    render(
      <TrailProjectTimeline
        label="Pacific project timeline"
        rangeEnd={Date.UTC(2026, 8, 3, 7)}
        rangeStart={Date.UTC(2026, 7, 30, 7)}
        rows={[]}
        timezone="America/Los_Angeles"
        today={Date.UTC(2026, 8, 1, 5)}
      />,
    );

    expect(screen.getByRole("img", { name: "Today, August 31, 2026" }))
      .toBeInTheDocument();
  });
});
