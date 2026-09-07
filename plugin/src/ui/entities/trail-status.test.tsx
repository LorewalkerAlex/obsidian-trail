import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";
import { TrailStatusGlyph } from "./trail-status";

const ISSUE_CASES = [
  ["backlog", "Backlog"],
  ["unstarted", "Todo"],
  ["started", "In Progress"],
  ["completed", "Done"],
  ["canceled", "Canceled"],
] as const satisfies readonly (readonly [TrailStatusCategory, string])[];

const PROJECT_CASES = [
  ["unstarted", "Planned"],
  ["started", "In Progress"],
  ["completed", "Completed"],
  ["canceled", "Canceled"],
] as const satisfies readonly (readonly [TrailProjectStatusCategory, string])[];

describe("TrailStatusGlyph", () => {
  it("keeps workflow status labels accessible while category owns the lifecycle mark", () => {
    render(
      <>
        {ISSUE_CASES.map(([category, label]) => (
          <TrailStatusGlyph category={category} key={category} label={label} />
        ))}
      </>,
    );

    for (const [category, label] of ISSUE_CASES) {
      expect(screen.getByRole("img", { name: `${label} status` }))
        .toHaveAttribute("data-status-category", category);
      expect(screen.getByRole("img", { name: `${label} status` }))
        .toHaveAttribute("data-status-entity-type", "issue");
    }
  });

  it("uses the Project hexagonal family without widening the Project status vocabulary", () => {
    render(
      <>
        {PROJECT_CASES.map(([category, label]) => (
          <TrailStatusGlyph
            category={category}
            entityType="project"
            key={category}
            label={label}
          />
        ))}
      </>,
    );

    for (const [category, label] of PROJECT_CASES) {
      expect(screen.getByRole("img", { name: `${label} status` }))
        .toHaveAttribute("data-status-category", category);
      expect(screen.getByRole("img", { name: `${label} status` }))
        .toHaveAttribute("data-status-entity-type", "project");
    }
  });

  it("can be decorative when visible text already supplies the status name", () => {
    const { container } = render(
      <TrailStatusGlyph category="started" decorative />,
    );

    const glyph = container.querySelector(".trail-status-glyph");
    expect(glyph).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps Linear-faithful workflow and Project geometry visibly distinct", () => {
    const { container } = render(
      <>
        <TrailStatusGlyph category="backlog" label="Backlog" />
        <TrailStatusGlyph category="started" label="In Progress" />
        <TrailStatusGlyph category="completed" label="Done" />
        <TrailStatusGlyph category="canceled" label="Canceled" />
        <TrailStatusGlyph category="unstarted" entityType="project" label="Planned" />
        <TrailStatusGlyph category="started" entityType="project" label="Active" />
        <TrailStatusGlyph category="completed" entityType="project" label="Completed" />
        <TrailStatusGlyph category="canceled" entityType="project" label="Canceled" />
      </>,
    );

    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='backlog'] .trail-status-glyph__issue-backlog-ring",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='started'] .trail-status-glyph__issue-progress",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='completed'] .trail-status-glyph__issue-ring",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='completed'] .trail-status-glyph__issue-fill",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='canceled'] .trail-status-glyph__issue-ring",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='issue'][data-status-category='canceled'] .trail-status-glyph__issue-fill",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='project'][data-status-category='unstarted'] .trail-status-glyph__project-frame",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='project'][data-status-category='started'] .trail-status-glyph__project-progress",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='project'][data-status-category='completed'] .trail-status-glyph__project-mark",
    )).not.toBeNull();
    expect(container.querySelector(
      "[data-status-entity-type='project'][data-status-category='canceled'] .trail-status-glyph__project-mark",
    )).not.toBeNull();
  });
});
