import type { TrailConfiguration } from "../domain/model/trail-configuration";
import type { TrailWorkspaceState } from "../domain/model/trail-workspace-state";
import {
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  type TrailProjectStatusCategory,
  type TrailStatusCategory,
} from "../domain/model/trail-values";

/** Minimal YAML parser for the simple Trail frontmatter used by owner-level codec tests. */
export function parseTrailTestYaml(yaml: string): unknown {
  const result: Record<string, unknown> = {};
  for (const rawLine of yaml.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;
    const separator = line.indexOf(":");
    if (separator < 0) throw new Error(`Invalid test YAML line: ${line}`);
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (key === "") throw new Error("Test YAML key must not be empty");
    if (rawValue.startsWith('"')) {
      result[key] = JSON.parse(rawValue);
    } else {
      result[key] = rawValue;
    }
  }
  return result;
}

function category(id: string) {
  return { defaultId: id, definitionIds: [id] } as const;
}

export function createTrailTestConfiguration(): TrailConfiguration {
  const issueStatusDefinitions = TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue.map((statusCategory) => ({
    category: statusCategory,
    entityType: "issue" as const,
    id: `issue-${statusCategory}`,
    name: statusCategory,
  }));
  const projectStatusDefinitions = TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project.map((statusCategory) => ({
    category: statusCategory,
    entityType: "project" as const,
    id: `project-${statusCategory}`,
    name: statusCategory,
  }));
  const issueStatuses = Object.fromEntries(
    TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue.map((statusCategory) => [
      statusCategory,
      category(`issue-${statusCategory}`),
    ]),
  ) as Readonly<Record<TrailStatusCategory, ReturnType<typeof category>>>;
  const projectStatuses = Object.fromEntries(
    TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project.map((statusCategory) => [
      statusCategory,
      category(`project-${statusCategory}`),
    ]),
  ) as Readonly<Record<TrailProjectStatusCategory, ReturnType<typeof category>>>;
  return {
    cycle: { defaultEndRule: "end-of-next-week" },
    labelGroups: [
      {
        id: "group-area",
        name: "Area",
        registeredEntityTypes: ["initiative", "project", "issue"],
        selectionMode: "single",
      },
    ],
    labels: [
      { groupId: "group-area", id: "label-work", name: "Work" },
    ],
    statusDefinitions: [
      ...issueStatusDefinitions,
      ...projectStatusDefinitions,
    ],
    temporal: { timezone: "Asia/Singapore" },
    workflowStatuses: {
      issue: issueStatuses,
      project: projectStatuses,
    },
  };
}

export function createTrailTestWorkspaceState(): TrailWorkspaceState {
  return {
    customViews: [
      {
        id: "view-active",
        name: "Active",
        presentation: { layout: "list" },
        selection: { entityType: "issue", filters: { status: "active" } },
      },
    ],
    favorites: [
      { targetId: "project-a", targetType: "project" },
      { targetId: "view-active", targetType: "custom-view" },
    ],
    home: {},
  };
}
