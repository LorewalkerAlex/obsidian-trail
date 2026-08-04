import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TrailVaultReadResult } from "./domain/trail-vault-reader";
import { TrailApp } from "./trail-app";

const data: TrailVaultReadResult = {
  areas: [
    {
      id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
      name: "Work",
      created: "2026-08-04",
      description: "Work Area",
      filePath: "Trail/Areas/Work/Area.md",
    },
  ],
  projects: [
    {
      id: "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
      areaId: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
      areaName: "Work",
      name: "Trail POC",
      created: "2026-08-04",
      status: "active",
      overview: "Validate the Markdown reading path.",
      tasks: [
        {
          id: "fa3b3a46-f818-416a-9dd0-59aa168bc467",
          projectId:
            "9e600f80-6b24-4738-b5cf-ef9f6f2974b6",
          projectPath:
            "Trail/Areas/Work/Trail POC.md",
          title: "Build the Trail parser",
          status: "doing",
          priority: "high",
          created: "2026-08-04T10:00:00+08:00",
          labels: ["type:spike"],
          subtasks: [
            {
              text: "Define the fixture",
              completed: true,
            },
            {
              text: "Validate issue isolation",
              completed: false,
            },
          ],
          notes: [
            {
              text: "Read again after cache update.",
            },
          ],
          source: {
            filePath:
              "Trail/Areas/Work/Trail POC.md",
            startOffset: 100,
            endOffset: 200,
          },
        },
      ],
      notes: [
        {
          text: "The POC is read-only.",
        },
      ],
      filePath:
        "Trail/Areas/Work/Trail POC.md",
    },
  ],
  issues: [],
};

describe("TrailApp", () => {
  it("renders the four top-level page controls", () => {
    render(<TrailApp data={data} />);

    expect(
      screen.getByRole("button", {
        name: "Dashboard",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Areas",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Project",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Fleeting Notes",
      }),
    ).toBeInTheDocument();
  });

  it("shows the parsed data summary", () => {
    render(<TrailApp data={data} />);

    expect(
      screen.getByRole("heading", {
        name: "Dashboard",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 Area · 1 Project · 1 Task",
      ),
    ).toBeInTheDocument();
  });

  it("shows Areas and their Projects", () => {
    render(<TrailApp data={data} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Areas",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Areas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(
      screen.getByText("Trail POC"),
    ).toBeInTheDocument();
  });

  it("shows the first parsed Project", () => {
    render(<TrailApp data={data} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Project",
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Trail POC",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Build the Trail parser (doing)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[x] Define the fixture"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("[ ] Validate issue isolation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Read again after cache update.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The POC is read-only."),
    ).toBeInTheDocument();
  });
});
