import type { TrailConfiguration } from "../domain/model/trail-configuration";
import type { TrailWorkspaceState } from "../domain/model/trail-workspace-state";

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
  const categories = ["backlog", "unstarted", "started", "completed", "canceled"] as const;
  const statusDefinitions = [
    ...categories.map((statusCategory) => ({
      category: statusCategory,
      entityType: "issue" as const,
      id: `issue-${statusCategory}`,
      name: statusCategory,
    })),
    ...categories.map((statusCategory) => ({
      category: statusCategory,
      entityType: "project" as const,
      id: `project-${statusCategory}`,
      name: statusCategory,
    })),
  ];
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
    statusDefinitions,
    temporal: { timezone: "Asia/Singapore" },
    workflowStatuses: {
      issue: {
        backlog: category("issue-backlog"),
        unstarted: category("issue-unstarted"),
        started: category("issue-started"),
        completed: category("issue-completed"),
        canceled: category("issue-canceled"),
      },
      project: {
        backlog: category("project-backlog"),
        unstarted: category("project-unstarted"),
        started: category("project-started"),
        completed: category("project-completed"),
        canceled: category("project-canceled"),
      },
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
