import { describe, expect, it } from "vitest";
import type { TrailConfiguration } from "./trail-configuration";
import type {
  TrailCycle,
  TrailInitiative,
  TrailMilestone,
  TrailProject,
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "./trail-entities";
import {
  TRAIL_ISSUE_CONTEXTS,
  TRAIL_LABEL_ENTITY_TYPES,
  TRAIL_LABEL_SELECTION_MODES,
  TRAIL_PRIORITIES,
  TRAIL_PROJECT_STATUS_CATEGORIES,
  TRAIL_STATUS_CATEGORIES,
  TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE,
  TRAIL_STATUS_ENTITY_TYPES,
} from "./trail-values";
import type { TrailWorkspaceState } from "./trail-workspace-state";

const triageIssue = {
  id: "issue-triage",
  title: "Review capture",
  context: "triage",
  due: 1_786_464_000_000,
  labelIds: [],
} satisfies TrailTriageIssue;

const project = {
  id: "project-a",
  title: "Trail",
  statusDefinitionId: "project-started",
  labelIds: [],
} satisfies TrailProject;

const workflowIssue = {
  id: "issue-workflow",
  title: "Implement parser",
  context: "workflow",
  projectId: project.id,
  statusDefinitionId: "issue-backlog",
  createdAt: 1_786_464_000_000,
  labelIds: [],
} satisfies TrailWorkflowIssue;

const initiative = {
  id: "initiative-a",
  title: "Personal productivity",
  labelIds: [],
} satisfies TrailInitiative;

const milestone = {
  id: "milestone-a",
  title: "Architecture foundation",
  projectId: project.id,
} satisfies TrailMilestone;

const cycle = {
  id: "cycle-a",
  startedAt: 1_786_464_000_000,
  plannedEnd: 1_787_068_800_000,
  issueIds: [workflowIssue.id],
} satisfies TrailCycle;

const configuration = {
  statusDefinitions: [
    { id: "issue-backlog", name: "Backlog", entityType: "issue", category: "backlog" },
    { id: "issue-todo", name: "Todo", entityType: "issue", category: "unstarted" },
    { id: "issue-started", name: "In Progress", entityType: "issue", category: "started" },
    { id: "issue-done", name: "Done", entityType: "issue", category: "completed" },
    { id: "issue-canceled", name: "Canceled", entityType: "issue", category: "canceled" },
    { id: "project-planned", name: "Planned", entityType: "project", category: "unstarted" },
    { id: "project-started", name: "In Progress", entityType: "project", category: "started" },
    { id: "project-done", name: "Completed", entityType: "project", category: "completed" },
    { id: "project-canceled", name: "Canceled", entityType: "project", category: "canceled" },
  ],
  workflowStatuses: {
    issue: {
      backlog: { defaultId: "issue-backlog", definitionIds: ["issue-backlog"] },
      unstarted: { defaultId: "issue-todo", definitionIds: ["issue-todo"] },
      started: { defaultId: "issue-started", definitionIds: ["issue-started"] },
      completed: { defaultId: "issue-done", definitionIds: ["issue-done"] },
      canceled: { defaultId: "issue-canceled", definitionIds: ["issue-canceled"] },
    },
    project: {
      unstarted: { defaultId: "project-planned", definitionIds: ["project-planned"] },
      started: { defaultId: "project-started", definitionIds: ["project-started"] },
      completed: { defaultId: "project-done", definitionIds: ["project-done"] },
      canceled: { defaultId: "project-canceled", definitionIds: ["project-canceled"] },
    },
  },
  labelGroups: [],
  labels: [],
  cycle: { defaultEndRule: "end-of-next-week" },
  temporal: { timezone: "Asia/Singapore" },
} satisfies TrailConfiguration;

const workspaceState = {
  customViews: [
    {
      id: "view-a",
      name: "Active work",
      selection: { entityType: "issue" },
      presentation: {},
    },
  ],
  favorites: [{ targetType: "project", targetId: project.id }],
  home: {},
} satisfies TrailWorkspaceState;

describe("rebuild Domain contracts", () => {
  it("freezes the system value axes without inventing No Priority", () => {
    expect(TRAIL_PRIORITIES).toEqual(["urgent", "high", "medium", "low"]);
    expect(TRAIL_STATUS_CATEGORIES).toEqual([
      "backlog",
      "unstarted",
      "started",
      "completed",
      "canceled",
    ]);
    expect(TRAIL_PROJECT_STATUS_CATEGORIES).toEqual([
      "unstarted",
      "started",
      "completed",
      "canceled",
    ]);
    expect(TRAIL_STATUS_CATEGORIES_BY_ENTITY_TYPE).toEqual({
      issue: TRAIL_STATUS_CATEGORIES,
      project: TRAIL_PROJECT_STATUS_CATEGORIES,
    });
    expect(TRAIL_ISSUE_CONTEXTS).toEqual(["triage", "workflow"]);
    expect(TRAIL_STATUS_ENTITY_TYPES).toEqual(["issue", "project"]);
    expect(TRAIL_LABEL_ENTITY_TYPES).toEqual([
      "initiative",
      "project",
      "issue",
    ]);
    expect(TRAIL_LABEL_SELECTION_MODES).toEqual(["single", "multiple"]);
  });

  it("represents every frozen Core Entity shape", () => {
    expect([
      initiative.id,
      project.id,
      milestone.id,
      triageIssue.id,
      workflowIssue.id,
      cycle.id,
    ]).toHaveLength(6);
  });

  it("keeps Configuration and Workspace State as separate authoritative contracts", () => {
    expect(configuration.cycle.defaultEndRule).toBe("end-of-next-week");
    expect(configuration.workflowStatuses.project).not.toHaveProperty("backlog");
    expect(workspaceState.customViews[0]?.selection.entityType).toBe("issue");
    expect(workspaceState.favorites[0]).toEqual({
      targetType: "project",
      targetId: "project-a",
    });
  });
});
