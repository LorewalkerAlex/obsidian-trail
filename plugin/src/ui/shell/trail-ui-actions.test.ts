import { describe, expect, it, vi } from "vitest";

import type { TrailProject } from "../../domain/model/trail-entities";
import {
  bindTrailProjectCollectionActions,
  bindTrailProjectDeleteAction,
  type TrailUiActions,
} from "./trail-ui-actions";

describe("Trail UI actions", () => {
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
