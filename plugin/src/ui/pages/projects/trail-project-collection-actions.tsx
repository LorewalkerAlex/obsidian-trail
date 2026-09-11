import {
  useMemo,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";

import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { useTrailActionMenuPresenter } from "../../interactions/trail-action-menu-context";
import type { TrailActionMenuItem } from "../../interactions/trail-action-menu";
import {
  executeTrailProjectCollectionAction,
  resolveTrailProjectActionScope,
  resolveTrailProjectBulkActionScope,
  resolveTrailProjectCollectionActionContext,
  type TrailProjectCollectionActionContext,
  type TrailProjectCollectionActionId,
} from "../../interactions/trail-project-action-registry";
import { TrailBulkBar } from "../../patterns/trail-bulk-bar";
import { TrailViewPopover } from "../../patterns/trail-view-popover";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailProjectCollectionActions = Pick<
  TrailUiActions["projects"],
  "changeInitiative" | "changeStatus"
>;

function executeAction(
  actions: TrailProjectCollectionActions,
  context: TrailProjectCollectionActionContext,
  actionId: TrailProjectCollectionActionId,
  targetId?: string,
): Promise<void> {
  return executeTrailProjectCollectionAction(actions, context, actionId, targetId);
}

function TrailProjectBulkActionPicker({
  action,
  context,
  execute,
}: {
  readonly action: TrailActionMenuItem<TrailProjectCollectionActionId>;
  readonly context: TrailProjectCollectionActionContext;
  readonly execute: (
    context: TrailProjectCollectionActionContext,
    actionId: TrailProjectCollectionActionId,
    targetId: string,
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchable = action.id === "project.change-initiative" && action.targets.length > 6;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const targets = useMemo(() => (
    !searchable || normalizedSearch === ""
      ? action.targets
      : action.targets.filter(({ label }) => label.toLocaleLowerCase().includes(normalizedSearch))
  ), [action.targets, normalizedSearch, searchable]);
  const buttonLabel = action.id === "project.change-status" ? "Status" : "Initiative";

  return (
    <TrailViewPopover
      align="center"
      label={action.label}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      open={open}
      sideOffset={6}
      trigger={<TrailButton>{buttonLabel}</TrailButton>}
      width="compact"
    >
      <div className="trail-view-popover__stack trail-project-bulk-action-picker">
        <div className="trail-view-popover__title">{action.label}</div>
        {searchable ? (
          <input
            aria-label={`Search ${buttonLabel.toLocaleLowerCase()}`}
            autoFocus
            className="trail-view-popover__search"
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={`Search ${buttonLabel.toLocaleLowerCase()}`}
            type="search"
            value={search}
          />
        ) : null}
        {targets.map((target) => (
          <button
            className="trail-view-popover__item"
            key={target.id}
            onClick={() => {
              setOpen(false);
              void execute(context, action.id, target.id).catch(() => undefined);
            }}
            type="button"
          >
            <span>{target.label}</span>
          </button>
        ))}
        {targets.length === 0 ? (
          <div className="trail-view-popover__title">No matches</div>
        ) : null}
      </div>
    </TrailViewPopover>
  );
}

export function useTrailProjectCollectionActions({
  actions,
  clearSelection,
  runtimeStore,
  selectedProjectIds,
}: {
  readonly actions: TrailProjectCollectionActions | undefined;
  readonly clearSelection: () => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly selectedProjectIds: ReadonlySet<string>;
}): {
  readonly bulkBar: ReactNode;
  readonly onProjectContextMenu: (
    event: Parameters<MouseEventHandler<HTMLDivElement>>[0],
    projectId: string,
  ) => void;
} {
  const actionMenu = useTrailActionMenuPresenter();
  const bulkContext = actions === undefined || selectedProjectIds.size === 0
    ? null
    : resolveTrailProjectCollectionActionContext(
        runtimeStore.getState(),
        resolveTrailProjectBulkActionScope(selectedProjectIds),
      );

  const onProjectContextMenu = (
    event: Parameters<MouseEventHandler<HTMLDivElement>>[0],
    projectId: string,
  ) => {
    if (actionMenu === null || actions === undefined) return;
    const context = resolveTrailProjectCollectionActionContext(
      runtimeStore.getState(),
      resolveTrailProjectActionScope({
        invokedProjectId: projectId,
        selectedProjectIds,
      }),
    );
    if (context === null) return;
    if (context.actions.length === 0 && context.unavailableReason === undefined) return;

    event.preventDefault();
    event.stopPropagation();
    actionMenu.showAtMouseEvent(event.nativeEvent, {
      items: context.actions,
      onSelect: (actionId, targetId) => executeAction(actions, context, actionId, targetId),
      unavailableReason: context.unavailableReason,
    });
  };

  return {
    bulkBar: actions === undefined || bulkContext === null ? null : (
      <TrailBulkBar
        actions={bulkContext.actions.length === 0 ? undefined : bulkContext.actions.map((action) => (
          <TrailProjectBulkActionPicker
            action={action}
            context={bulkContext}
            execute={(context, actionId, targetId) => executeAction(
              actions,
              context,
              actionId,
              targetId,
            )}
            key={action.id}
          />
        ))}
        count={selectedProjectIds.size}
        onClear={clearSelection}
      />
    ),
    onProjectContextMenu,
  };
}
