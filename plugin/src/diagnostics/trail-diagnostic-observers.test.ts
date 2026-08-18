import { describe, expect, it, vi } from "vitest";

import type { TrailApplicationSession } from "../application/trail-application-session";
import type {
  TrailCycle,
  TrailMilestone,
  TrailProject,
  TrailWorkflowIssue,
} from "../domain/model/trail-entities";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import { createTrailMutationPlan } from "../mutation/plans/trail-mutation-plan";
import { createTrailRuntimeStore, setTrailRuntimeControl } from "../runtime/store/trail-runtime-store";
import type { TrailDiagnostics, TrailDiagnosticRecordOptions } from "./trail-diagnostics";
import {
  createDiagnosticTrailSourceSync,
  createDiagnosticTrailUiActions,
  observeTrailRuntimeDiagnostics,
} from "./trail-diagnostic-observers";

function recorder() {
  const events: Array<{ name: string; options?: TrailDiagnosticRecordOptions }> = [];
  const diagnostics: TrailDiagnostics = {
    enabled: true,
    createCorrelationId: (prefix) => `session:${prefix}:1`,
    dispose: () => Promise.resolve(),
    exportRecent: () => Promise.resolve(""),
    flush: () => Promise.resolve(),
    record: (name, options) => events.push({ name, options }),
  };
  return { diagnostics, events };
}

function pendingReceipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: new Promise<void>(() => { /* keep pending so the test isolates submission telemetry */ }),
    entityId,
  };
}

describe("Trail diagnostic observers", () => {
  it("correlates logical mutation submission and completion by command ID", async () => {
    const { diagnostics, events } = recorder();
    const submit = vi.fn(async () => ({ operations: [], topology: "single" as const }));
    const sourceSync = createDiagnosticTrailSourceSync(
      { submit } as unknown as TrailAuthoritativeSourceSync,
      diagnostics,
    );
    const plan = createTrailMutationPlan({
      commandId: "command-a",
      effects: [{
        after: {
          kind: "project",
          value: {
            id: "project-a",
            labelIds: [],
            statusDefinitionId: "status-a",
            title: "Project A",
          },
        },
        kind: "create-entity",
      }],
      intent: "project.create",
    });

    await sourceSync.submit(plan);

    expect(events.map(({ name }) => name)).toEqual([
      "mutation.submitted",
      "mutation.committed",
    ]);
    expect(events[0]?.options?.correlationId).toBe("command-a");
    expect(events[1]?.options?.correlationId).toBe("command-a");
  });

  it("observes Project lifecycle actions on the UI diagnostics boundary", () => {
    const { diagnostics, events } = recorder();
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    };
    const changeStatus = vi.fn(() => ({
      entityId: project.id,
      kind: "unchanged" as const,
    }));
    const session = {
      projects: { changeStatus },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.projects.changeStatus(project, "project-started");

    expect(changeStatus).toHaveBeenCalledWith(project, "project-started");
    expect(events).toEqual([{
      name: "ui.project.status.unchanged",
      options: {
        data: {
          entityId: project.id,
          projectId: project.id,
          targetStatusDefinitionId: "project-started",
        },
      },
    }]);
  });

  it("observes Project Initiative assignment without changing Application semantics", () => {
    const { diagnostics, events } = recorder();
    const project: TrailProject = {
      id: "project-a",
      initiativeId: "initiative-a",
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project A",
    };
    const changeInitiative = vi.fn(() => ({
      entityId: project.id,
      kind: "unchanged" as const,
    }));
    const session = {
      projects: { changeInitiative },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.projects.changeInitiative(project, undefined);

    expect(changeInitiative).toHaveBeenCalledWith(project, undefined);
    expect(events).toEqual([{
      name: "ui.project.initiative.unchanged",
      options: {
        data: {
          entityId: project.id,
          projectId: project.id,
          sourceInitiativeId: "initiative-a",
          targetInitiativeId: null,
        },
      },
    }]);
  });

  it("observes Milestone management and Issue Milestone assignment on the UI boundary", () => {
    const { diagnostics, events } = recorder();
    const milestone: TrailMilestone = {
      id: "milestone-a",
      projectId: "project-a",
      title: "Milestone A",
    };
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      milestoneId: milestone.id,
      projectId: milestone.projectId,
      statusDefinitionId: "issue-unstarted",
      title: "Issue A",
    };
    const create = vi.fn(() => pendingReceipt("new-milestone"));
    const deleteMilestone = vi.fn(() => pendingReceipt(milestone.id));
    const changeMilestone = vi.fn(() => ({
      entityId: issue.id,
      kind: "unchanged" as const,
    }));
    const session = {
      issues: { changeMilestone },
      milestones: { create, delete: deleteMilestone },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.milestones.create(milestone.projectId, "Checkpoint", 123);
    actions.milestones.delete(milestone);
    actions.issues.changeMilestone(issue, undefined);

    expect(create).toHaveBeenCalledWith(milestone.projectId, "Checkpoint", 123);
    expect(deleteMilestone).toHaveBeenCalledWith(milestone, undefined);
    expect(changeMilestone).toHaveBeenCalledWith(issue, undefined);
    expect(events).toEqual([
      {
        name: "ui.milestone.create.submitted",
        options: {
          correlationId: "command-new-milestone",
          data: {
            due: 123,
            entityId: "new-milestone",
            projectId: milestone.projectId,
            titleLength: 10,
          },
        },
      },
      {
        name: "ui.milestone.delete.submitted",
        options: {
          correlationId: `command-${milestone.id}`,
          data: {
            entityId: milestone.id,
            milestoneId: milestone.id,
            projectId: milestone.projectId,
            replacementMilestoneId: null,
          },
        },
      },
      {
        name: "ui.workflow.issue-milestone.unchanged",
        options: {
          data: {
            entityId: issue.id,
            issueId: issue.id,
            sourceMilestoneId: milestone.id,
            targetMilestoneId: null,
          },
        },
      },
    ]);
  });

  it("observes Workflow Issue planning-property edits without logging description content", () => {
    const { diagnostics, events } = recorder();
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      statusDefinitionId: "issue-unstarted",
      title: "Issue A",
    };
    const editProperties = vi.fn(() => ({
      entityId: issue.id,
      kind: "unchanged" as const,
    }));
    const session = {
      issues: { editProperties },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);
    const input = {
      description: "Private planning notes",
      due: 123,
      estimate: 3,
      labelIds: ["label-a"],
      priority: "high" as const,
      title: "Updated Issue",
    };

    actions.issues.editProperties(issue, input);

    expect(editProperties).toHaveBeenCalledWith(issue, input);
    expect(events).toEqual([{
      name: "ui.workflow.issue-properties.unchanged",
      options: {
        data: {
          descriptionProvided: true,
          due: 123,
          entityId: issue.id,
          estimate: 3,
          issueId: issue.id,
          labelCount: 1,
          priority: "high",
          titleLength: 13,
        },
      },
    }]);
  });

  it("observes Cycle planning actions without changing Application semantics", () => {
    const { diagnostics, events } = recorder();
    const cycle: TrailCycle = {
      id: "cycle-a",
      issueIds: ["issue-a"],
      plannedEnd: 200,
      startedAt: 100,
    };
    const open = vi.fn(() => pendingReceipt("cycle-new"));
    const changeMembership = vi.fn(() => ({
      entityId: cycle.id,
      kind: "unchanged" as const,
    }));
    const close = vi.fn(() => pendingReceipt(cycle.id));
    const session = {
      cycles: { changeMembership, close, open },
    } as unknown as TrailApplicationSession;
    const actions = createDiagnosticTrailUiActions(session, diagnostics);

    actions.cycles.open({ issueIds: ["issue-a", "issue-b"], plannedEnd: 300 });
    actions.cycles.changeMembership(cycle, ["issue-b"]);
    actions.cycles.close(cycle);

    expect(open).toHaveBeenCalledWith({ issueIds: ["issue-a", "issue-b"], plannedEnd: 300 });
    expect(changeMembership).toHaveBeenCalledWith(cycle, ["issue-b"]);
    expect(close).toHaveBeenCalledWith(cycle);
    expect(events).toEqual([
      {
        name: "ui.cycle.open.submitted",
        options: {
          correlationId: "command-cycle-new",
          data: {
            entityId: "cycle-new",
            issueCount: 2,
            plannedEnd: 300,
          },
        },
      },
      {
        name: "ui.cycle.membership.unchanged",
        options: {
          data: {
            cycleId: cycle.id,
            entityId: cycle.id,
            issueCount: 1,
          },
        },
      },
      {
        name: "ui.cycle.close.submitted",
        options: {
          correlationId: `command-${cycle.id}`,
          data: {
            cycleId: cycle.id,
            entityId: cycle.id,
            issueCount: 1,
          },
        },
      },
    ]);
  });

  it("records Runtime control and pending transitions only when they change", () => {
    const { diagnostics, events } = recorder();
    const store = createTrailRuntimeStore();
    const dispose = observeTrailRuntimeDiagnostics(store, diagnostics);

    setTrailRuntimeControl(store, { kind: "ready" });
    setTrailRuntimeControl(store, { kind: "ready" });
    dispose();

    expect(events.map(({ name }) => name)).toEqual([
      "runtime.observer.started",
      "runtime.control.changed",
    ]);
  });
});
