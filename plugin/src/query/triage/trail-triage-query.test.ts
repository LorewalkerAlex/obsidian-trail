import { describe, expect, it } from "vitest";

import type {
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailTriageIssue,
} from "../../domain/model/trail-entities";
import type { TrailPriority } from "../../domain/model/trail-values";
import { addTrailCalendarDays } from "../../domain/rules/trail-temporal-rules";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { selectTrailReadableTriageIssueIds } from "../shared/trail-effective-query";
import {
  selectTrailTriagePageReadModel,
  selectTrailTriageReviewSetIssueIds,
  selectTrailTriageVisibleIssueIds,
} from "./trail-triage-query";

function triageIssue({
  due,
  id,
  labelIds = [],
  priority,
}: {
  readonly due: number;
  readonly id: string;
  readonly labelIds?: readonly string[];
  readonly priority?: TrailPriority;
}): TrailTriageIssue {
  return {
    context: "triage",
    due,
    id,
    labelIds,
    priority,
    title: id,
  };
}

function readyTriageStore(issues: readonly TrailTriageIssue[]) {
  const configuration = createTrailTestConfiguration();
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const milestone: TrailMilestone = {
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [milestone],
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

  return { configuration, store };
}

describe("Triage Query", () => {
  it("orders equal Review Due values by Priority before stable identity", () => {
    const due = Date.UTC(2026, 8, 2, 4);
    const { store } = readyTriageStore([
      triageIssue({ due, id: "triage-none" }),
      triageIssue({ due, id: "triage-low", priority: "low" }),
      triageIssue({ due, id: "triage-medium", priority: "medium" }),
      triageIssue({ due, id: "triage-high", priority: "high" }),
      triageIssue({ due, id: "triage-urgent-z", priority: "urgent" }),
      triageIssue({ due, id: "triage-urgent-a", priority: "urgent" }),
    ]);

    expect(selectTrailReadableTriageIssueIds(store.getState())).toEqual([
      "triage-urgent-a",
      "triage-urgent-z",
      "triage-high",
      "triage-medium",
      "triage-low",
      "triage-none",
    ]);
  });

  it("filters with OR inside one property and AND across Triage properties", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const { store } = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-a", labelIds: ["label-work"], priority: "high" }),
      triageIssue({ due: due(2), id: "triage-b", priority: "urgent" }),
      triageIssue({ due: due(2), id: "triage-c", labelIds: ["label-work"], priority: "medium" }),
      triageIssue({ due: due(2), id: "triage-d", priority: "high" }),
    ]);

    expect(selectTrailTriageVisibleIssueIds(store.getState(), {
      filter: {
        labels: {
          kind: "discrete",
          values: [{ kind: "value", value: "label-work" }],
        },
        priority: {
          kind: "discrete",
          values: [
            { kind: "value", value: "urgent" },
            { kind: "value", value: "high" },
          ],
        },
      },
      now,
      ordering: "review-due",
    })).toEqual(["triage-a"]);

    expect(selectTrailTriageVisibleIssueIds(store.getState(), {
      filter: {
        labels: {
          kind: "discrete",
          values: [
            { kind: "none" },
            { kind: "value", value: "label-work" },
          ],
        },
      },
      now,
      ordering: "review-due",
    })).toEqual(["triage-b", "triage-a", "triage-d", "triage-c"]);
  });

  it("uses shared local-calendar Due cutoff semantics and keeps required Due non-nullable", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const { configuration, store } = readyTriageStore([
      triageIssue({ due: Date.UTC(2026, 7, 31, 4), id: "triage-overdue" }),
      triageIssue({ due: Date.UTC(2026, 8, 1, 15), id: "triage-today" }),
      triageIssue({ due: Date.UTC(2026, 8, 2, 4), id: "triage-later" }),
    ]);
    expect(configuration.temporal.timezone).toBe("Asia/Singapore");

    expect(selectTrailTriageVisibleIssueIds(store.getState(), {
      filter: { due: { kind: "due", value: { kind: "today" } } },
      now,
      ordering: "review-due",
    })).toEqual(["triage-overdue", "triage-today"]);

    expect(selectTrailTriageVisibleIssueIds(store.getState(), {
      filter: { due: { kind: "due", value: { kind: "overdue" } } },
      now,
      ordering: "review-due",
    })).toEqual(["triage-overdue"]);
  });

  it("supports the constrained Priority ordering without changing canonical default ordering", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const { store } = readyTriageStore([
      triageIssue({ due: Date.UTC(2026, 8, 2, 4), id: "triage-low", priority: "low" }),
      triageIssue({ due: Date.UTC(2026, 8, 5, 4), id: "triage-urgent-later", priority: "urgent" }),
      triageIssue({ due: Date.UTC(2026, 8, 3, 4), id: "triage-urgent-earlier", priority: "urgent" }),
      triageIssue({ due: Date.UTC(2026, 8, 1, 4), id: "triage-none" }),
    ]);

    expect(selectTrailTriageVisibleIssueIds(store.getState(), {
      filter: {},
      now,
      ordering: "priority",
    })).toEqual([
      "triage-urgent-earlier",
      "triage-urgent-later",
      "triage-low",
      "triage-none",
    ]);
    expect(selectTrailReadableTriageIssueIds(store.getState())).toEqual([
      "triage-none",
      "triage-low",
      "triage-urgent-earlier",
      "triage-urgent-later",
    ]);
  });

  it("builds one Page-facing projection for queue rows and Review Set presentation", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const { store } = readyTriageStore([
      triageIssue({
        due: due(2),
        id: "triage-work",
        labelIds: ["label-work"],
        priority: "high",
      }),
      ...Array.from({ length: 11 }, (_, index) => triageIssue({
        due: due(index + 3),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const page = selectTrailTriagePageReadModel(store.getState(), {
      filter: {},
      now,
      ordering: "review-due",
    });

    expect(page).not.toBeNull();
    expect(page?.queue[0]).toMatchObject({
      id: "triage-work",
      priority: "high",
      title: "triage-work",
    });
    expect(page?.queue[0]?.labels.map((label) => label.id)).toEqual(["label-work"]);
    expect(page?.visibleIssueIds).toEqual(page?.queue.map((item) => item.id));
    expect(page?.accept).toEqual({
      issue: {
        defaultProjectId: "project-a",
        projects: [{
          id: "project-a",
          milestones: [{ id: "milestone-a", title: "Milestone A" }],
          title: "Project A",
        }],
      },
      project: {
        initiatives: [{ id: "initiative-a", title: "Initiative A" }],
      },
    });
    expect(page?.reviewSet).toEqual({
      boundaryAfterIssueId: "triage-08",
      count: 10,
      needsGlobalQualifier: false,
    });
    expect(page?.filteredEmpty).toBe(false);

    const priorityPage = selectTrailTriagePageReadModel(store.getState(), {
      filter: {
        priority: {
          kind: "discrete",
          values: [{ kind: "value", value: "high" }],
        },
      },
      now,
      ordering: "priority",
    });
    expect(priorityPage?.visibleIssueIds).toEqual(["triage-work"]);
    expect(priorityPage?.reviewSet.count).toBe(10);
    expect(priorityPage?.reviewSet.boundaryAfterIssueId).toBeUndefined();
    expect(priorityPage?.reviewSet.needsGlobalQualifier).toBe(true);

    const emptyPage = selectTrailTriagePageReadModel(store.getState(), {
      filter: {
        priority: {
          kind: "discrete",
          values: [{ kind: "value", value: "urgent" }],
        },
      },
      now,
      ordering: "review-due",
    });
    expect(emptyPage?.filteredEmpty).toBe(true);
  });

  it("keeps every seven-day horizon entry and tops up short horizons in normal order", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const configuration = createTrailTestConfiguration();
    const due = (days: number) => addTrailCalendarDays(
      now,
      configuration.temporal.timezone,
      days,
    );
    const issues = [
      -1, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12,
    ].map((days, index) => triageIssue({
      due: due(days),
      id: `triage-${String(index).padStart(2, "0")}`,
    }));
    const { store } = readyTriageStore(issues);

    expect(selectTrailTriageReviewSetIssueIds(store.getState(), now)).toEqual(
      issues.slice(0, 10).map(({ id }) => id),
    );
  });

  it("does not truncate a horizon that already contains more than ten entries", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const configuration = createTrailTestConfiguration();
    const horizonEnd = addTrailCalendarDays(
      now,
      configuration.temporal.timezone,
      7,
    );
    const issues = Array.from({ length: 11 }, (_, index) => triageIssue({
      due: horizonEnd,
      id: `triage-${String(index).padStart(2, "0")}`,
    }));
    const { store } = readyTriageStore(issues);

    expect(selectTrailTriageReviewSetIssueIds(store.getState(), now)).toEqual(
      issues.map(({ id }) => id),
    );
  });

  it("treats the configured seven-calendar-day instant as an inclusive boundary", () => {
    const now = Date.UTC(2026, 8, 1, 4);
    const configuration = createTrailTestConfiguration();
    const horizonEnd = addTrailCalendarDays(
      now,
      configuration.temporal.timezone,
      7,
    );
    const inside = Array.from({ length: 10 }, (_, index) => triageIssue({
      due: index === 9 ? horizonEnd : horizonEnd - (10 - index),
      id: `triage-in-${String(index).padStart(2, "0")}`,
    }));
    const outside = triageIssue({
      due: horizonEnd + 1,
      id: "triage-outside",
      priority: "urgent",
    });
    const { store } = readyTriageStore([...inside, outside]);

    expect(selectTrailTriageReviewSetIssueIds(store.getState(), now)).toEqual(
      inside.map(({ id }) => id),
    );
  });
});
