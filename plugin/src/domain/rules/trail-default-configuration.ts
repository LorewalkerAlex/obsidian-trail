import type {
  TrailConfiguration,
  TrailStatusCategoryConfiguration,
  TrailStatusDefinition,
  TrailWorkflowStatusConfiguration,
} from "../model/trail-configuration";
import {
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  type TrailProjectId,
  type TrailProjectStatusCategory,
  type TrailStatusCategory,
} from "../model/trail-values";
import type { TrailWorkspaceState } from "../model/trail-workspace-state";
import {
  validateTrailConfiguration,
  validateTrailWorkspaceState,
} from "../validation/trail-configuration-validation";
import { isTrailId } from "../validation/trail-value-validation";

const ISSUE_DEFAULT_NAMES: Readonly<Record<TrailStatusCategory, string>> = {
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
};

const PROJECT_DEFAULT_NAMES: Readonly<Record<TrailProjectStatusCategory, string>> = {
  unstarted: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

function createStatusCategory(
  createId: () => string,
): { readonly id: string; readonly configuration: TrailStatusCategoryConfiguration } {
  const id = createId().trim();
  if (!isTrailId(id)) throw new Error("Default StatusDefinition ID must be non-empty text");
  return {
    configuration: { defaultId: id, definitionIds: [id] },
    id,
  };
}

function createIssueStatuses(
  createId: () => string,
  definitions: TrailStatusDefinition[],
): TrailWorkflowStatusConfiguration["issue"] {
  const statuses = {} as Record<TrailStatusCategory, TrailStatusCategoryConfiguration>;
  for (const category of TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.issue) {
    const created = createStatusCategory(createId);
    definitions.push({
      category,
      entityType: "issue",
      id: created.id,
      name: ISSUE_DEFAULT_NAMES[category],
    });
    statuses[category] = created.configuration;
  }
  return statuses;
}

function createProjectStatuses(
  createId: () => string,
  definitions: TrailStatusDefinition[],
): TrailWorkflowStatusConfiguration["project"] {
  const statuses = {} as Record<TrailProjectStatusCategory, TrailStatusCategoryConfiguration>;
  for (const category of TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE.project) {
    const created = createStatusCategory(createId);
    definitions.push({
      category,
      entityType: "project",
      id: created.id,
      name: PROJECT_DEFAULT_NAMES[category],
    });
    statuses[category] = created.configuration;
  }
  return statuses;
}

/** Builds only the initial mutable Configuration; names remain user-editable labels. */
export function createDefaultTrailConfiguration(input: {
  readonly createId: () => string;
  readonly timezone: string;
}): TrailConfiguration {
  const definitions: TrailStatusDefinition[] = [];
  const workflowStatuses: TrailWorkflowStatusConfiguration = {
    issue: createIssueStatuses(input.createId, definitions),
    project: createProjectStatuses(input.createId, definitions),
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
