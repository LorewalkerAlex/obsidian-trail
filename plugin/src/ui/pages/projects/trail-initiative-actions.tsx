import type { MouseEventHandler } from "react";
import { useRef, useState } from "react";

import type { TrailInitiativeApplication } from "../../../application/initiatives/trail-initiative-application";
import type { TrailInitiative } from "../../../domain/model/trail-entities";
import type { TrailActionMenuItem } from "../../interactions/trail-action-menu";
import { useTrailActionMenuPresenter } from "../../interactions/trail-action-menu-context";
import { TrailConfirmation } from "../../patterns/trail-confirmation";
import { TrailIconButton } from "../../primitives/trail-icon-button";

type TrailInitiativeActionId = "initiative.delete" | "initiative.edit";

function TrailMoreIcon() {
  return (
    <svg aria-hidden="true" className="trail-action-overflow-icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12.5" cy="8" r="1" />
    </svg>
  );
}

export function TrailInitiativeActions({
  actions,
  expectedInitiative,
  onDeleted,
  onEdit,
  projectCount,
  writable,
}: {
  readonly actions: Pick<TrailInitiativeApplication, "delete">;
  readonly expectedInitiative: TrailInitiative;
  readonly onDeleted: () => void;
  readonly onEdit: () => void;
  readonly projectCount: number;
  readonly writable: boolean;
}) {
  const actionMenu = useTrailActionMenuPresenter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleActionMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (actionMenu === null) return;
    returnFocusRef.current = event.currentTarget.closest<HTMLElement>(".trail-initiative-page");
    const bounds = event.currentTarget.getBoundingClientRect();
    const items: readonly TrailActionMenuItem<TrailInitiativeActionId>[] = writable
      ? [
          {
            group: "common-mutation",
            id: "initiative.edit",
            label: "Edit initiative",
            targets: [],
          },
          {
            group: "destructive",
            id: "initiative.delete",
            label: "Delete initiative",
            targets: [],
          },
        ]
      : [];
    actionMenu.showAtPosition({ x: bounds.right, y: bounds.bottom }, {
      items,
      onSelect: (actionId) => {
        if (actionId === "initiative.edit") onEdit();
        else setDeleteOpen(true);
      },
      unavailableReason: writable ? undefined : "Trail is temporarily read-only.",
    });
  };

  return (
    <>
      <TrailIconButton
        icon={<TrailMoreIcon />}
        label="More initiative actions"
        onClick={handleActionMenu}
      />
      {deleteOpen ? (
        <TrailConfirmation
          confirmLabel="Delete initiative"
          description={projectCount === 0
            ? "No projects are assigned to this initiative."
            : `${projectCount} ${projectCount === 1 ? "project becomes" : "projects become"} unassigned. Projects and their issues are preserved.`}
          onConfirm={() => {
            const receipt = actions.delete(expectedInitiative);
            onDeleted();
            void receipt.completion.catch(() => undefined);
          }}
          onOpenChange={setDeleteOpen}
          open
          returnFocusRef={returnFocusRef}
          title={`Delete "${expectedInitiative.title}"?`}
          tone="danger"
        />
      ) : null}
    </>
  );
}
