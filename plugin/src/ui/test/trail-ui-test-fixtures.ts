import { createDefaultTrailPluginData } from "../../domain/trail-configuration";
import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";
import { setTrailRuntimeAvailability } from "../../runtime/control/trail-runtime-control";
import {
  reconcileProjectContribution,
  reconcileTriageContribution,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeConfiguration,
} from "../../runtime/store/trail-runtime-store";

export function createReadyTrailUiStore() {
  const store = createTrailRuntimeStore();
  let id = 0;
  setTrailRuntimeConfiguration(store, createDefaultTrailPluginData({
    createId: () => `status-${id += 1}`,
    timezone: "UTC",
  }).configuration);
  setTrailRuntimeAvailability(store, {
    kind: "ready",
    timezone: "UTC",
  });
  reconcileTriageContribution(store, {
    filePath: "Trail/Collections/Triage.md",
    issuesById: {},
  });
  return store;
}

export function seedTriageIssue(
  store: ReturnType<typeof createReadyTrailUiStore>,
  input: {
    readonly due: number;
    readonly id: string;
    readonly title: string;
  },
): TrailTriageIssue {
  const issue: TrailTriageIssue = {
    context: "triage",
    due: input.due,
    id: input.id,
    labelIds: [],
    title: input.title,
  };
  reconcileTriageContribution(store, {
    filePath: "Trail/Collections/Triage.md",
    issuesById: { [issue.id]: issue },
  });
  return issue;
}

export function seedWorkflowProject(
  store: ReturnType<typeof createReadyTrailUiStore>,
): {
  readonly issue: TrailWorkflowIssue;
  readonly project: TrailProject;
} {
  const configuration = store.getState().committed.configuration;
  if (configuration === null) throw new Error("missing configuration");

  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: configuration.statuses.project.unstarted.defaultId,
    title: "Workflow Project",
  };
  const issue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: 100,
    id: "workflow-issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: configuration.statuses.issue.backlog.defaultId,
    title: "Implement flow",
  };

  reconcileProjectContribution(store, {
    filePath: "Trail/Projects/0001 Workflow Project.md",
    issuesById: { [issue.id]: issue },
    project,
  });
  return { issue, project };
}
