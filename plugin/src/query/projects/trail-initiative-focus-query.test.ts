import { describe, expect, it } from "vitest";

import type {
  TrailInitiative,
  TrailProject,
} from "../../domain/model/trail-entities";
import type { TrailPriority, TrailProjectStatusCategory } from "../../domain/model/trail-values";
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
import { selectTrailInitiativeFocusReadModel } from "./trail-initiative-focus-query";

const NOW = Date.UTC(2026, 8, 12, 9);
const DAY_MS = 24 * 60 * 60 * 1000;

function project(input: {
  readonly due?: number;
  readonly id: string;
  readonly initiativeId?: string;
  readonly priority?: TrailPriority;
  readonly status?: TrailProjectStatusCategory;
  readonly title?: string;
}): TrailProject {
  return {
    due: input.due,
    id: input.id,
    initiativeId: input.initiativeId,
    labelIds: [],
    priority: input.priority,
    statusDefinitionId: `project-${input.status ?? "unstarted"}`,
    title: input.title ?? input.id,
  };
}

function readyStore(
  initiatives: readonly TrailInitiative[],
  projects: readonly TrailProject[],
) {
  const configuration = createTrailTestConfiguration();
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(projects[0].id),
    },
    sources: [
      ...initiatives.map((initiative, index) => ({
        initiative,
        kind: "initiative" as const,
        sourcePath: `Trail/Initiatives/${String(index + 1).padStart(4, "0")} ${initiative.title}.md`,
      })),
      ...projects.map((item, index) => ({
        issues: [],
        kind: "project" as const,
        milestones: [],
        project: item,
        sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${item.title}.md`,
      })),
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return store;
}

describe("Initiative Focus Query", () => {
  it("scopes to one Initiative while keeping every Project lifecycle visible by default", () => {
    const alpha: TrailInitiative = {
      description: "Alpha outcome",
      id: "initiative-alpha",
      labelIds: [],
      title: "Alpha",
    };
    const beta: TrailInitiative = { id: "initiative-beta", labelIds: [], title: "Beta" };
    const projects = [
      project({
        due: NOW + (10 * DAY_MS),
        id: "project-alpha-started",
        initiativeId: alpha.id,
        priority: "high",
        status: "started",
      }),
      project({
        due: NOW - DAY_MS,
        id: "project-alpha-completed",
        initiativeId: alpha.id,
        priority: "urgent",
        status: "completed",
      }),
      project({
        id: "project-beta",
        initiativeId: beta.id,
        status: "unstarted",
      }),
    ];
    const store = readyStore([alpha, beta], projects);

    const page = selectTrailInitiativeFocusReadModel(store.getState(), {
      filter: {},
      initiativeId: alpha.id,
      now: NOW,
    });

    expect(page?.initiative).toEqual({
      description: "Alpha outcome",
      id: alpha.id,
      title: "Alpha",
    });
    expect(page?.visibleProjectIds).toEqual([
      "project-alpha-started",
      "project-alpha-completed",
    ]);
    expect(page?.emptyKind).toBeUndefined();
    expect(page?.initiatives.map(({ title }) => title)).toEqual(["Alpha", "Beta"]);
  });

  it("uses the shared Project Filter grammar and reports a filtered empty scoped collection", () => {
    const alpha: TrailInitiative = { id: "initiative-alpha", labelIds: [], title: "Alpha" };
    const projects = [
      project({ id: "project-started", initiativeId: alpha.id, priority: "high", status: "started" }),
      project({ id: "project-completed", initiativeId: alpha.id, status: "completed" }),
    ];
    const store = readyStore([alpha], projects);

    const completed = selectTrailInitiativeFocusReadModel(store.getState(), {
      filter: {
        status: {
          kind: "discrete",
          values: [{ kind: "value", value: "project-completed" }],
        },
      },
      initiativeId: alpha.id,
      now: NOW,
    });
    expect(completed?.visibleProjectIds).toEqual(["project-completed"]);

    const noMatch = selectTrailInitiativeFocusReadModel(store.getState(), {
      filter: {
        priority: {
          kind: "discrete",
          values: [{ kind: "value", value: "urgent" }],
        },
      },
      initiativeId: alpha.id,
      now: NOW,
    });
    expect(noMatch?.visibleProjectIds).toEqual([]);
    expect(noMatch?.emptyKind).toBe("filtered");
  });

  it("distinguishes a truly empty Initiative and a missing Initiative location", () => {
    const alpha: TrailInitiative = { id: "initiative-alpha", labelIds: [], title: "Alpha" };
    const empty: TrailInitiative = { id: "initiative-empty", labelIds: [], title: "Empty" };
    const projects = [project({ id: "project-alpha", initiativeId: alpha.id })];
    const store = readyStore([alpha, empty], projects);

    expect(selectTrailInitiativeFocusReadModel(store.getState(), {
      filter: {},
      initiativeId: empty.id,
      now: NOW,
    })?.emptyKind).toBe("true");

    expect(selectTrailInitiativeFocusReadModel(store.getState(), {
      filter: {},
      initiativeId: "initiative-missing",
      now: NOW,
    })).toBeNull();
  });
});
