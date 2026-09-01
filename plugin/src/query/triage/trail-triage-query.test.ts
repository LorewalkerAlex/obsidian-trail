import { describe, expect, it } from "vitest";

import type {
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
import { selectTrailTriageReviewSetIssueIds } from "./trail-triage-query";

function triageIssue({
  due,
  id,
  priority,
}: {
  readonly due: number;
  readonly id: string;
  readonly priority?: TrailPriority;
}): TrailTriageIssue {
  return {
    context: "triage",
    due,
    id,
    labelIds: [],
    priority,
    title: id,
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
