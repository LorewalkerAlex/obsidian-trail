import { vi } from "vitest";

import type {
  TrailInitiative,
  TrailMilestone,
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

export function createTrailUiTestHarness(input: {
  readonly projectStatusDefinitionId?: string;
  readonly workflowStatusDefinitionId?: string;
} = {}) {
  const triage: TrailTriageIssue = {
    context: "triage",
    due: Date.UTC(2026, 7, 16, 10, 0),
    id: "triage-a",
    labelIds: [],
    title: "Captured",
  };
  const initiative: TrailInitiative = {
    id: "initiative-a",
    labelIds: [],
    title: "Initiative A",
  };
  const project = {
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: input.projectStatusDefinitionId ?? "project-unstarted",
    title: "Project A",
  };
  const projectB = {
    id: "project-b",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project B",
  };
  const milestone: TrailMilestone = {
    due: Date.UTC(2026, 7, 22, 9, 0),
    id: "milestone-a",
    projectId: project.id,
    title: "Milestone A",
  };
  const workflowStatusDefinitionId = input.workflowStatusDefinitionId ?? "issue-unstarted";
  const workflowIsTerminal = workflowStatusDefinitionId === "issue-completed"
    || workflowStatusDefinitionId === "issue-canceled";
  const workflow: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: Date.UTC(2026, 7, 15),
    id: "issue-a",
    labelIds: [],
    milestoneId: milestone.id,
    projectId: project.id,
    statusDefinitionId: workflowStatusDefinitionId,
    title: "Issue A",
    ...(workflowStatusDefinitionId === "issue-started"
      ? { firstStartedAt: Date.UTC(2026, 7, 15, 1) }
      : {}),
    ...(workflowStatusDefinitionId === "issue-completed" ? { estimate: 1 } : {}),
    ...(workflowIsTerminal ? { terminalAt: Date.UTC(2026, 7, 15, 2) } : {}),
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
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative A.md",
      },
      {
        issues: [workflow],
        kind: "project",
        milestones: [milestone],
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
    cycles: {
      changeMembership: vi.fn(() => ({ kind: "unchanged" as const, entityId: "cycle-a" })),
      close: vi.fn(() => receipt("cycle-a")),
      open: vi.fn(() => receipt("new-cycle")),
    },
    initiatives: {
      create: vi.fn(() => receipt("new-initiative")),
    },
    issues: {
      changeMilestone: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
      changeStatus: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
      create: vi.fn(() => receipt("new-issue")),
      editProperties: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
      moveToProject: vi.fn(() => ({ kind: "unchanged" as const, entityId: workflow.id })),
    },
    milestones: {
      create: vi.fn(() => receipt("new-milestone")),
      delete: vi.fn(() => receipt(milestone.id)),
    },
    projects: {
      changeInitiative: vi.fn(() => ({ kind: "unchanged" as const, entityId: project.id })),
      changeStatus: vi.fn(() => ({ kind: "unchanged" as const, entityId: project.id })),
      create: vi.fn(() => receipt("new-project")),
      editProperties: vi.fn(() => ({ kind: "unchanged" as const, entityId: project.id })),
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

  return {
    actions,
    initiative,
    milestone,
    project,
    projectB,
    runtimeStore,
    triage,
    workflow,
  };
}
