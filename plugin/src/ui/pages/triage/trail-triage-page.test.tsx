import { render, screen } from "@testing-library/react";
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
  priority,
  title = id,
}: {
  readonly due: number;
  readonly id: string;
  readonly priority?: TrailTriageIssue["priority"];
  readonly title?: string;
}): TrailTriageIssue {
  return {
    context: "triage",
    due,
    id,
    labelIds: [],
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
  vi.useRealTimers();
});

describe("TrailTriagePage", () => {
  it("renders the effective Query queue in canonical order with the global Review Set boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-high", priority: "high", title: "High same due" }),
      triageIssue({ due: due(2), id: "triage-urgent", priority: "urgent", title: "Urgent same due" }),
      ...Array.from({ length: 10 }, (_, index) => triageIssue({
        due: due(index + 3),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const { container } = render(<TrailTriagePage runtimeStore={store} />);

    expect(screen.getByRole("region", { name: "Triage queue" })).toBeInTheDocument();
    expect(screen.getByText("10 to review")).toBeInTheDocument();
    const titles = Array.from(container.querySelectorAll(".trail-triage-row__title"))
      .map((element) => element.textContent);
    expect(titles.slice(0, 2)).toEqual(["Urgent same due", "High same due"]);
    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(12);
    expect(container.querySelectorAll("time.trail-due-date")).toHaveLength(12);
    const boundary = container.querySelector("[data-review-boundary='true']");
    expect(boundary).not.toBeNull();
    expect(boundary?.previousElementSibling).toHaveTextContent("triage-07");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
