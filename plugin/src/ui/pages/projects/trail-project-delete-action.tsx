import type { MouseEventHandler } from "react";
import { useRef, useState } from "react";

import type { TrailMutationActionResult } from "../../../application/trail-application-support";
import type { TrailProject } from "../../../domain/model/trail-entities";
import { selectTrailProjectDeleteReadModel } from "../../../query/projects/trail-project-delete-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailRelationPropertySelect } from "../../entities/trail-relation-property-select";
import { useTrailActionMenuPresenter } from "../../interactions/trail-action-menu-context";
import {
  resolveTrailProjectActionContext,
  type TrailProjectActionContext,
  type TrailProjectActionId,
} from "../../interactions/trail-project-action-registry";
import { TrailConfirmation } from "../../patterns/trail-confirmation";
import { TrailIconButton } from "../../primitives/trail-icon-button";

function TrailProjectMoreIcon() {
  return (
    <svg aria-hidden="true" className="trail-action-overflow-icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12.5" cy="8" r="1" />
    </svg>
  );
}

function consequenceCopy(childIssueCount: number, milestoneCount: number): string {
  const consequences: string[] = [];
  if (childIssueCount > 0) {
    consequences.push(
      `${childIssueCount} ${childIssueCount === 1 ? "issue" : "issues"} will move to the project you choose`,
    );
  }
  if (milestoneCount > 0) {
    consequences.push(
      `${milestoneCount} ${milestoneCount === 1 ? "milestone" : "milestones"} will be deleted`,
    );
  }
  if (childIssueCount > 0 && milestoneCount > 0) {
    consequences.push("moved issues will no longer reference milestones from this project");
  }
  return consequences.length === 0
    ? "This project will be removed from Trail."
    : `${consequences.join(". ")}.`;
}

export function TrailProjectDeleteAction({
  onDelete,
  onDeleted,
  projectId,
  runtimeStore,
}: {
  readonly onDelete: (
    expectedProject: TrailProject,
    replacementProjectId?: string,
  ) => TrailMutationActionResult;
  readonly onDeleted: () => void;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const actionMenu = useTrailActionMenuPresenter();
  const [deleteContext, setDeleteContext] = useState<TrailProjectActionContext | null>(null);
  const [replacementProjectId, setReplacementProjectId] = useState<string>();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const deleteReadModel = deleteContext?.deleteReadModel;
  const replacementRequired = (deleteReadModel?.childIssueCount ?? 0) > 0;
  const replacementUnavailable = replacementRequired
    && deleteReadModel?.replacementProjects.length === 0;
  const replacementSelected = replacementProjectId !== undefined
    && deleteReadModel?.replacementProjects.some(({ id }) => id === replacementProjectId) === true;
  const confirmDisabled = replacementRequired && !replacementSelected;

  const handleActionMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (actionMenu === null) return;
    const state = runtimeStore.getState();
    const currentDeleteReadModel = selectTrailProjectDeleteReadModel(state, projectId);
    if (currentDeleteReadModel === null) return;
    const context = resolveTrailProjectActionContext(
      currentDeleteReadModel,
      state.control.kind === "ready",
    );
    returnFocusRef.current = event.currentTarget.closest<HTMLElement>(
      ".trail-project-workspace-page",
    );
    const bounds = event.currentTarget.getBoundingClientRect();
    actionMenu.showAtPosition({ x: bounds.right, y: bounds.bottom }, {
      items: context.actions,
      onSelect: (actionId: TrailProjectActionId) => {
        if (actionId !== "project.delete") return;
        setReplacementProjectId(undefined);
        setDeleteContext(context);
      },
      unavailableReason: context.unavailableReason,
    });
  };

  return (
    <>
      <TrailIconButton
        icon={<TrailProjectMoreIcon />}
        label="More project actions"
        onClick={handleActionMenu}
      />

      {deleteReadModel === undefined ? null : (
        <TrailConfirmation
          confirmDisabled={confirmDisabled}
          confirmLabel="Delete project"
          description={(
            <span className="trail-project-delete-flow">
              <span className="trail-project-delete-flow__prompt">
                Delete <span className="trail-project-delete-flow__project-name">
                  “{deleteReadModel.expectedProject.title}”
                </span>?
              </span>
              <span className="trail-project-delete-flow__consequence">
                {consequenceCopy(
                  deleteReadModel.childIssueCount,
                  deleteReadModel.milestoneCount,
                )}
              </span>
              {replacementRequired ? (
                <span className="trail-project-delete-flow__replacement">
                  <span className="trail-project-delete-flow__label">
                    Move {deleteReadModel.childIssueCount === 1 ? "issue" : "issues"} to
                  </span>
                  <TrailRelationPropertySelect
                    disabled={replacementUnavailable}
                    label="Replacement project"
                    noneLabel="Select project"
                    onValueChange={(value) => setReplacementProjectId(value)}
                    options={deleteReadModel.replacementProjects.map((project) => ({
                      id: project.id,
                      title: project.title,
                    }))}
                    required
                    searchable
                    value={replacementProjectId}
                  />
                  {replacementUnavailable ? (
                    <span className="trail-project-delete-flow__warning">
                      No project can accept every child issue without changing its status.
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
          )}
          onConfirm={() => {
            const result = onDelete(
              deleteReadModel.expectedProject,
              replacementProjectId,
            );
            if (result.kind !== "submitted") return;
            onDeleted();
            void result.receipt.completion.catch(() => undefined);
          }}
          onOpenChange={(open) => {
            if (open) return;
            setDeleteContext(null);
            setReplacementProjectId(undefined);
          }}
          open
          returnFocusRef={returnFocusRef}
          title="Delete project"
          tone="danger"
        />
      )}
    </>
  );
}
