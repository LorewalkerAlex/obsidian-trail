import { describe, expect, it, vi } from "vitest";

import type {
  TrailCycle,
  TrailProject,
  TrailWorkflowIssue,
} from "../../domain/model/trail-entities";
import {
  bindTrailCyclePageActions,
  bindTrailProjectCollectionActions,
  bindTrailProjectDeleteAction,
  type TrailUiActions,
} from "./trail-ui-actions";

describe("Trail UI actions", () => {
  it("preserves the Cycle and Issue Application receivers across the Cycle Page boundary", () => {
    const cycle: TrailCycle = {
      id: "cycle-a",
      issueIds: ["issue-a"],
      plannedEnd: 2,
      startedAt: 1,
    };
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: "project-a",
      statusDefinitionId: "issue-started",
      title: "Issue A",
    };
    const cycles = {
      marker: "cycle-application",
      changeMembership(
        this: { readonly marker: string },
        expectedCycle: TrailCycle,
        _issueIds: readonly string[],
      ) {
        expect(this.marker).toBe("cycle-application");
        return { entityId: expectedCycle.id, kind: "unchanged" as const };
      },
    };
    const issues = {
      marker: "issue-application",
      changeStatus(
        this: { readonly marker: string },
        expectedIssue: TrailWorkflowIssue,
        _targetStatusDefinitionId: string,
      ) {
        expect(this.marker).toBe("issue-application");
        return { entityId: expectedIssue.id, kind: "unchanged" as const };
      },
    };
    const membershipSpy = vi.spyOn(cycles, "changeMembership");
    const statusSpy = vi.spyOn(issues, "changeStatus");

    const cyclePageActions = bindTrailCyclePageActions(cycles, issues);
    cyclePageActions.changeMembership(cycle, []);
    cyclePageActions.changeStatus(issue, "issue-completed");

    expect(membershipSpy).toHaveBeenCalledWith(cycle, []);
    expect(statusSpy).toHaveBeenCalledWith(issue, "issue-completed", undefined);
  });

  it("preserves the Project Application receiver across collection action boundaries", () => {
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Project A",
    };
    const collectionOwner = {
      marker: "project-application",
      changeInitiative(
        this: { readonly marker: string },
        expectedProject: TrailProject,
        targetInitiativeId?: string,
      ) {
        expect(this.marker).toBe("project-application");
        return { entityId: expectedProject.id, kind: "unchanged" as const };
      },
      changeStatus(
        this: { readonly marker: string },
        expectedProject: TrailProject,
        _targetStatusDefinitionId: string,
      ) {
        expect(this.marker).toBe("project-application");
        return { entityId: expectedProject.id, kind: "unchanged" as const };
      },
    };
    const initiativeSpy = vi.spyOn(collectionOwner, "changeInitiative");
    const statusSpy = vi.spyOn(collectionOwner, "changeStatus");

    const collectionActions = bindTrailProjectCollectionActions(collectionOwner);
    collectionActions?.changeInitiative(project, "initiative-b");
    collectionActions?.changeStatus(project, "project-completed");

    expect(initiativeSpy).toHaveBeenCalledWith(project, "initiative-b");
    expect(statusSpy).toHaveBeenCalledWith(project, "project-completed");
  });

  it("preserves the Project Application receiver across the Delete callback boundary", () => {
    const project: TrailProject = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Project A",
    };
    const completion = Promise.resolve();
    const deleteOwner = {
      marker: "project-application",
      delete(
        this: { readonly marker: string },
        expectedProject: TrailProject,
        replacementProjectId?: string,
      ) {
        expect(this.marker).toBe("project-application");
        return {
          kind: "submitted" as const,
          receipt: {
            commandId: "delete-project",
            completion,
            entityId: expectedProject.id,
          },
        };
      },
    };
    const spy = vi.spyOn(deleteOwner, "delete");
    const projects = deleteOwner as unknown as TrailUiActions["projects"];

    const deleteProject = bindTrailProjectDeleteAction(projects);
    const result = deleteProject?.(project, "project-b");

    expect(result?.kind).toBe("submitted");
    expect(spy).toHaveBeenCalledWith(project, "project-b");
  });
});
