import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  TrailArea,
  TrailProject,
} from "./trail-model";
import {
  createPlannedProjectMarkdown,
  matchesPlannedProjectDraft,
  projectPathForArea,
  suggestTrailProjectName,
  TrailProjectCreationError,
  type TrailPlannedProjectDraft,
} from "./trail-project-creation";

const PROJECT_ID =
  "e6b7f407-3a8d-4c5b-8c78-62065ce9c7bb";
const area: TrailArea = {
  id: "df4ec59e-bfe4-4a09-a079-43ff9350642d",
  name: "Work",
  created: "2026-08-04",
  description: "Work Area",
  filePath: "Trail/Areas/Work/Area.md",
};
const draft: TrailPlannedProjectDraft = {
  id: PROJECT_ID,
  name: "Project Launch",
  created: "2026-08-06",
  overview: "  Shape the launch plan.  ",
};

describe("Trail Project creation", () => {
  it("creates the canonical planned Project Markdown", () => {
    expect(createPlannedProjectMarkdown(draft)).toBe([
      "---",
      `id: "${PROJECT_ID}"`,
      "created: 2026-08-06",
      "status: planned",
      "---",
      "",
      "## Overview",
      "",
      "Shape the launch plan.",
      "",
      "## Tasks",
      "",
      "## Notes",
      "",
    ].join("\n"));
  });

  it("derives the Project path from the Area folder", () => {
    expect(projectPathForArea(
      area,
      " Project Launch ",
    )).toBe(
      "Trail/Areas/Work/Project Launch.md",
    );
  });

  it("suggests a file-safe name from visible Markdown", () => {
    expect(suggestTrailProjectName(
      "Plan **Trail** / launch: [[Target|Roadmap]]?",
    )).toBe("Plan Trail launch Roadmap");
  });

  it("replaces every invalid file-name character", () => {
    expect(suggestTrailProjectName(
      "A/B:C*D?E|F<G>H",
    )).toBe("A B C D E F G H");
  });

  it("falls back when the suggestion is reserved", () => {
    expect(suggestTrailProjectName("CON")).toBe(
      "Untitled Project",
    );
  });

  it("rejects invalid Project names", () => {
    expect(() => projectPathForArea(
      area,
      "Invalid/Name",
    )).toThrow(TrailProjectCreationError);
    expect(() => projectPathForArea(
      area,
      "Project.md",
    )).toThrow(
      "without a .md suffix",
    );
  });

  it("matches the parsed Project against its draft", () => {
    const project: TrailProject = {
      id: draft.id,
      areaId: area.id,
      areaName: area.name,
      name: draft.name,
      created: draft.created,
      status: "planned",
      overview: draft.overview.trim(),
      tasks: [],
      notes: [],
      filePath: projectPathForArea(area, draft.name),
    };

    expect(matchesPlannedProjectDraft(
      project,
      area,
      draft,
    )).toBe(true);
    expect(matchesPlannedProjectDraft(
      {
        ...project,
        status: "active",
      },
      area,
      draft,
    )).toBe(false);
  });
});
