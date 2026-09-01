import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  TrailProject,
  TrailTriageIssue,
} from "../../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import { TrailTriagePage } from "./trail-triage-page";

function triageIssue({
  due,
  id,
  labelIds = [],
  priority,
  title = id,
}: {
  readonly due: number;
  readonly id: string;
  readonly labelIds?: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title?: string;
}): TrailTriageIssue {
  return {
    context: "triage",
    due,
    id,
    labelIds,
    priority,
    title,
  };
}

function readyTriageStore(issues: readonly TrailTriageIssue[]) {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues,
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TrailTriagePage", () => {
  it("renders the effective Query queue with shared View Bar, Label, Due, and Review Set presentation", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({
        due: due(2),
        id: "triage-high",
        labelIds: ["label-work"],
        priority: "high",
        title: "High same due",
      }),
      triageIssue({ due: due(2), id: "triage-urgent", priority: "urgent", title: "Urgent same due" }),
      ...Array.from({ length: 10 }, (_, index) => triageIssue({
        due: due(index + 3),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);

    expect(screen.getByRole("region", { name: "Triage queue" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Triage view controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(screen.getByText("10 to review")).toBeInTheDocument();
    const titles = Array.from(container.querySelectorAll(".trail-triage-row__title"))
      .map((element) => element.textContent);
    expect(titles.slice(0, 2)).toEqual(["Urgent same due", "High same due"]);
    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(12);
    expect(container.querySelectorAll("time.trail-due-date")).toHaveLength(12);
    expect(screen.getByRole("img", { name: "Labels: Work" })).toBeInTheDocument();
    const boundary = container.querySelector("[data-review-boundary='true']");
    expect(boundary).not.toBeNull();
    expect(boundary?.previousElementSibling).toHaveTextContent("triage-07");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|accept|defer|delete/i })).not.toBeInTheDocument();
  });

  it("applies the shared Filter immediately without redefining the global Review Set boundary", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-high", priority: "high", title: "High match" }),
      triageIssue({ due: due(3), id: "triage-low", priority: "low", title: "Low hidden" }),
      ...Array.from({ length: 10 }, (_, index) => triageIssue({
        due: due(index + 4),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(1);
    expect(screen.getByText("High match")).toBeInTheDocument();
    expect(screen.queryByText("Low hidden")).not.toBeInTheDocument();
    expect(screen.getByText("10 to review overall")).toBeInTheDocument();
    expect(container.querySelector("[data-review-boundary='true']")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear priority filter" })).toBeInTheDocument();
  });
  it("exposes the frozen Triage Filter registry and applies Due as a cutoff", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({ due: Date.UTC(2026, 7, 31, 4), id: "triage-overdue", title: "Overdue" }),
      triageIssue({ due: Date.UTC(2026, 8, 1, 15), id: "triage-today", title: "Today cutoff" }),
      triageIssue({ due: Date.UTC(2026, 8, 2, 4), id: "triage-tomorrow", title: "Tomorrow" }),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByRole("button", { name: "Due" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Status" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Due" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(2);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Today cutoff")).toBeInTheDocument();
    expect(screen.queryByText("Tomorrow")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear due filter" })).toBeInTheDocument();
  });

  it("builds the Labels filter from issue-capable configuration definitions", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-work",
        labelIds: ["label-work"],
        title: "Work item",
      }),
      triageIssue({ due: Date.UTC(2026, 8, 3, 4), id: "triage-none", title: "No label item" }),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Labels" }));

    expect(screen.getByRole("searchbox", { name: "Search labels" })).toBeInTheDocument();
    expect(screen.getByText("Area")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Work" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(1);
    expect(screen.getByText("Work item")).toBeInTheDocument();
    expect(screen.queryByText("No label item")).not.toBeInTheDocument();
  });

  it("switches only between the two frozen Triage ordering choices", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-low-earlier",
        priority: "low",
        title: "Low earlier",
      }),
      triageIssue({
        due: Date.UTC(2026, 8, 5, 4),
        id: "triage-urgent-later",
        priority: "urgent",
        title: "Urgent later",
      }),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);
    const titles = () => Array.from(container.querySelectorAll(".trail-triage-row__title"))
      .map((element) => element.textContent);

    expect(titles()).toEqual(["Low earlier", "Urgent later"]);
    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));

    expect(titles()).toEqual(["Urgent later", "Low earlier"]);
    expect(screen.getByText("2 to review overall")).toBeInTheDocument();
    expect(container.querySelector("[data-review-boundary='true']")).toBeNull();
  });

  it("distinguishes a filtered-empty queue from a genuinely empty collection", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-low",
        priority: "low",
        title: "Low only",
      }),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(0);
    expect(screen.getByText("No Triage entries match the filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Low only")).toBeInTheDocument();
  });

});
