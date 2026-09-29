import type {
  App,
  Plugin,
  SettingDefinitionGroup,
  SettingDefinitionItem,
  SettingDefinitionList,
  SettingDefinitionPage,
  SettingGroupItem,
} from "obsidian";
import { describe, expect, it, vi } from "vitest";

import type { TrailConfigurationApplication } from "../../application/configuration/trail-configuration-application";
import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import type { TrailRuntimeControl } from "../../runtime/control/trail-runtime-control";
import {
  createTrailRuntimeStore,
  type TrailRuntimeStore,
} from "../../runtime/store/trail-runtime-store";
import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import { TrailSettingsTab } from "./trail-settings-tab";

function runtimeStoreWith(
  configuration: TrailConfiguration,
  control: TrailRuntimeControl = { kind: "ready" },
): TrailRuntimeStore {
  const store = createTrailRuntimeStore();
  store.setState((state) => ({
    committed: {
      ...state.committed,
      authoritative: {
        ...state.committed.authoritative,
        configuration,
      },
    },
    control,
  }));
  return store;
}

function createTab(
  configuration: TrailConfiguration,
  control?: TrailRuntimeControl,
  application: Partial<TrailConfigurationApplication> = {},
): TrailSettingsTab {
  const plugin = { register: vi.fn() } as unknown as Plugin;
  return new TrailSettingsTab(
    {} as App,
    plugin,
    runtimeStoreWith(configuration, control),
    application as TrailConfigurationApplication,
  );
}

function requireGroup(
  item: SettingDefinitionItem,
  heading: string,
): SettingDefinitionGroup {
  if (!("type" in item) || item.type !== "group" || item.heading !== heading) {
    throw new Error(`Expected ${heading} settings group`);
  }
  return item;
}

function requirePage(item: SettingGroupItem, name: string): SettingDefinitionPage {
  if (!("type" in item) || item.type !== "page" || item.name !== name) {
    throw new Error(`Expected ${name} settings page`);
  }
  return item;
}

function requireList(item: SettingDefinitionItem, heading: string): SettingDefinitionList {
  if (!("type" in item) || item.type !== "list" || item.heading !== heading) {
    throw new Error(`Expected ${heading} settings list`);
  }
  return item as SettingDefinitionList;
}

describe("TrailSettingsTab", () => {
  it("keeps the root as a compact configuration overview", () => {
    const definitions = createTab(createTrailTestConfiguration()).getSettingDefinitions();

    expect(definitions).toHaveLength(1);
    const configuration = requireGroup(definitions[0], "Configuration");
    const pages = configuration.items ?? [];
    const statuses = requirePage(pages[0], "Workflow statuses");
    const labels = requirePage(pages[1], "Labels");

    expect(statuses.displayValue).toBe("9 statuses");
    expect(labels.displayValue).toBe("1 group · 1 label");
  });

  it("separates Issue and Project statuses into category lists", () => {
    const definitions = createTab(createTrailTestConfiguration()).getSettingDefinitions();
    const configuration = requireGroup(definitions[0], "Configuration");
    const statuses = requirePage(
      configuration.items?.[0] as SettingGroupItem,
      "Workflow statuses",
    );
    const entityTypes = requireGroup(
      statuses.items?.[0] as SettingDefinitionItem,
      "Entity types",
    );
    const issueStatuses = requirePage(entityTypes.items?.[0] as SettingGroupItem, "Issue statuses");
    const projectStatuses = requirePage(entityTypes.items?.[1] as SettingGroupItem, "Project statuses");

    expect(issueStatuses.displayValue).toBe("5 categories · 5 statuses");
    expect(projectStatuses.displayValue).toBe("4 categories · 4 statuses");
    expect(issueStatuses.items?.map((item) => (
      "heading" in item ? item.heading : undefined
    ))).toEqual(["Backlog", "Unstarted", "Started", "Completed", "Canceled"]);

    const backlog = requireList(issueStatuses.items?.[0] as SettingDefinitionItem, "Backlog");
    expect(backlog.items?.map(({ name }) => name)).toEqual(["backlog"]);
    expect(backlog.addItem?.name).toBe("Add status to Backlog");
    expect(backlog.onDelete).toBeUndefined();
    expect(backlog.onReorder).toBeUndefined();
  });

  it("uses native list reorder and delete callbacks only for multi-status categories", () => {
    const base = createTrailTestConfiguration();
    const configuration: TrailConfiguration = {
      ...base,
      statusDefinitions: [
        ...base.statusDefinitions,
        {
          category: "started",
          entityType: "issue",
          id: "issue-started-review",
          name: "In review",
        },
      ],
      workflowStatuses: {
        ...base.workflowStatuses,
        issue: {
          ...base.workflowStatuses.issue,
          started: {
            ...base.workflowStatuses.issue.started,
            definitionIds: [
              ...base.workflowStatuses.issue.started.definitionIds,
              "issue-started-review",
            ],
          },
        },
      },
    };
    const reorderStatusDefinitions = vi.fn(() => ({ kind: "unchanged" as const }));
    const definitions = createTab(configuration, undefined, {
      reorderStatusDefinitions,
    }).getSettingDefinitions();
    const root = requireGroup(definitions[0], "Configuration");
    const statuses = requirePage(root.items?.[0] as SettingGroupItem, "Workflow statuses");
    const entities = requireGroup(statuses.items?.[0] as SettingDefinitionItem, "Entity types");
    const issues = requirePage(entities.items?.[0] as SettingGroupItem, "Issue statuses");
    const started = requireList(issues.items?.[2] as SettingDefinitionItem, "Started");

    expect(started.items?.map(({ name }) => name)).toEqual(["started", "In review"]);
    expect(started.onDelete).toBeTypeOf("function");
    expect(started.onReorder).toBeTypeOf("function");

    started.onReorder?.(0, 1);
    expect(reorderStatusDefinitions).toHaveBeenCalledWith(expect.objectContaining({
      category: "started",
      definitionIds: ["issue-started-review", "issue-started"],
      entityType: "issue",
    }));
  });

  it("nests Label management beneath Label Group detail pages", () => {
    const definitions = createTab(createTrailTestConfiguration()).getSettingDefinitions();
    const configuration = requireGroup(definitions[0], "Configuration");
    const labelsPage = requirePage(configuration.items?.[1] as SettingGroupItem, "Labels");
    const groups = requireList(labelsPage.items?.[0] as SettingDefinitionItem, "Label groups");
    const area = requirePage(groups.items?.[0] as SettingGroupItem, "Area");

    expect(area.displayValue).toBe("One label · 3 entity types · 1 label");
    expect(area.items?.map((item) => (
      "heading" in item ? item.heading : undefined
    ))).toEqual(["Group", "Labels", "Danger zone"]);

    const labels = requireList(area.items?.[1] as SettingDefinitionItem, "Labels");
    expect(labels.items?.map(({ name }) => name)).toEqual(["Work"]);
    expect(labels.addItem?.name).toBe("Add label to Area");
    expect(labels.onDelete).toBeTypeOf("function");
  });

  it("keeps readable pages while omitting mutation affordances when Runtime is not writable", () => {
    const definitions = createTab(
      createTrailTestConfiguration(),
      { kind: "refreshing" },
    ).getSettingDefinitions();
    const configuration = requireGroup(definitions[1], "Configuration");
    const statuses = requirePage(configuration.items?.[0] as SettingGroupItem, "Workflow statuses");
    const labelsPage = requirePage(configuration.items?.[1] as SettingGroupItem, "Labels");
    const groups = requireList(labelsPage.items?.[0] as SettingDefinitionItem, "Label groups");

    expect(statuses.status).toBe("warning");
    expect(labelsPage.status).toBe("warning");
    expect(groups.addItem).toBeUndefined();
  });
});
