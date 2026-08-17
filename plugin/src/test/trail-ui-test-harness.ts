import { vi } from "vitest";

import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "./trail-test-fixtures";
import type { TrailUiActions } from "../ui/shell/trail-ui-actions";

export function createTrailUiTestHarness() {
  const triage: TrailTriageIssue = {
    context: "triage",
    due: Date.UTC(2026, 7, 16, 10, 0),
    id: "triage-a",
    labelIds: [],
    title: "Captured",
  };
  const project = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const workflow: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: Date.UTC(2026, 7, 15),
    id: "issue-a",
    labelIds: [],
    projectId: project.id,
    statusDefinitionId: "issue-unstarted",
    title: "Issue A",
  };
  const runtimeStore = createTrailRuntimeStore();
  publishTrailCommittedRuntime(runtimeStore, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(),
    },
    sources: [
      { issues: [triage], kind: "triage", sourcePath: "Trail/Collections/Triage.md" },
      {
        issues: [workflow],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: projectB,
        sourcePath: "Trail/Projects/0002 Project B.md",
      },
      { issues: [], kind: "projectless-issues", sourcePath: "Trail/Collections/Projectless Issues.md" },
      { cycles: [], kind: "cycles", sourcePath: "Trail/Collections/Cycles.md" },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(runtimeStore, { kind: "ready" });

  const receipt = (entityId: string) => ({
    commandId: `command-${entityId}`,
    completion: Promise.resolve(),
    entityId,
  });
  const actions: TrailUiActions = {
    issues: {
      changeStatus: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
      create: vi.fn(() => receipt("new-issue")),
      moveToProject: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
    },
    projects: {
      create: vi.fn(() => receipt("new-project")),
    },
    triage: {
      accept: vi.fn(() => receipt("accepted-issue")),
      capture: vi.fn(() => receipt("new-triage")),
      convertToProject: vi.fn(() => receipt("converted-project")),
      defer: vi.fn(() => receipt(triage.id)),
      delete: vi.fn(() => receipt(triage.id)),
      edit: vi.fn(() => ({ kind: "unchanged" as const, entityId: triage.id })),
    },
  };

  return { actions, project, projectB, runtimeStore, triage, workflow };
}
