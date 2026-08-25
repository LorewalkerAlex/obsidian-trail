import type {
  TrailConfiguration,
  TrailEntityStatusConfiguration,
  TrailStatusDefinition,
  TrailWorkflowStatusConfiguration,
} from "../model/trail-configuration";
import type { TrailProjectId } from "../model/trail-values";
import { TRAIL_STATUS_CATEGORIES } from "../model/trail-values";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";
import {
  validateTrailConfiguration,
  validateTrailWorkspaceState,
} from "../validation/trail-configuration-validation";
import { isTrailId } from "../validation/trail-value-validation";

const ISSUE_DEFAULT_NAMES = {
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
} as const;

const PROJECT_DEFAULT_NAMES = {
  backlog: "Backlog",
  unstarted: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
} as const;

function createEntityStatuses(
  entityType: "issue" | "project",
  names: Readonly<Record<(typeof TRAIL_STATUS_CATEGORIES)[number], string>>,
  createId: () => string,
  definitions: TrailStatusDefinition[],
): TrailEntityStatusConfiguration {
  return Object.fromEntries(TRAIL_STATUS_CATEGORIES.map((category) => {
    const id = createId().trim();
    if (!isTrailId(id)) throw new Error("Default StatusDefinition ID must be non-empty text");
    definitions.push({ category, entityType, id, name: names[category] });
    return [category, { defaultId: id, definitionIds: [id] }] as const;
  })) as unknown as TrailEntityStatusConfiguration;
}

/** Builds only the initial mutable Configuration; names remain user-editable labels. */
export function createDefaultTrailConfiguration(input: {
  readonly createId: () => string;
  readonly timezone: string;
}): TrailConfiguration {
  const definitions: TrailStatusDefinition[] = [];
  const workflowStatuses: TrailWorkflowStatusConfiguration = {
    issue: createEntityStatuses("issue", ISSUE_DEFAULT_NAMES, input.createId, definitions),
    project: createEntityStatuses("project", PROJECT_DEFAULT_NAMES, input.createId, definitions),
  };
  const configuration: TrailConfiguration = {
    cycle: { defaultEndRule: "end-of-next-week" },
    labelGroups: [],
    labels: [],
    statusDefinitions: definitions,
    temporal: { timezone: input.timezone },
    workflowStatuses,
  };
  const issues = validateTrailConfiguration(configuration);
  if (issues.length > 0) {
    throw new Error(`Unable to build valid default Trail Configuration: ${issues.map(({ message }) => message).join("; ")}`);
  }
  return configuration;
}

export function createDefaultTrailWorkspaceState(
  defaultProjectId?: TrailProjectId,
): TrailWorkspaceState {
  const workspaceState: TrailWorkspaceState = {
    customViews: [],
    ...(defaultProjectId === undefined ? {} : { defaultProjectId }),
    favorites: [],
    home: {},
  };
  const issues = validateTrailWorkspaceState(workspaceState);
  if (issues.length > 0) {
    throw new Error(`Unable to build valid default Trail Workspace State: ${issues.map(({ message }) => message).join("; ")}`);
  }
  return workspaceState;
}
