import {
  FuzzySuggestModal,
  Menu,
  Notice,
  type App,
} from "obsidian";

import type {
  TrailActionMenuItem,
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
  TrailActionMenuTarget,
} from "../../ui/interactions/trail-action-menu";

class TrailActionTargetSuggestModal<TActionId extends string> extends FuzzySuggestModal<TrailActionMenuTarget> {
  public constructor(
    app: App,
    private readonly action: TrailActionMenuItem<TActionId>,
    private readonly onSelect: TrailActionMenuRequest<TActionId>["onSelect"],
  ) {
    super(app);
    this.modalEl.addClass("trail-action-target-suggest");
    this.setPlaceholder(action.label);
  }

  public getItems(): TrailActionMenuTarget[] {
    return [...this.action.targets];
  }

  public getItemText(item: TrailActionMenuTarget): string {
    return item.label;
  }

  public onChooseItem(item: TrailActionMenuTarget): void {
    invokeMenuSelection(this.onSelect, this.action.id, item.id);
  }
}

function actionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function invokeMenuSelection<TActionId extends string>(
  onSelect: TrailActionMenuRequest<TActionId>["onSelect"],
  actionId: TActionId,
  targetId?: string,
): void {
  try {
    void Promise.resolve(onSelect(actionId, targetId)).catch((error: unknown) => {
      new Notice(`Trail action failed: ${actionErrorMessage(error)}`);
    });
  } catch (error: unknown) {
    new Notice(`Trail action failed: ${actionErrorMessage(error)}`);
  }
}

function addActionItems<TActionId extends string>(
  app: App,
  menu: Menu,
  request: TrailActionMenuRequest<TActionId>,
): void {
  if (request.items.length === 0) {
    menu.addItem((item) => item
      .setTitle(request.unavailableReason ?? "No actions available")
      .setSection("trail-action")
      .setDisabled(true));
    return;
  }

  let previousGroup: string | undefined;
  for (const action of request.items) {
    if (previousGroup !== undefined && action.group !== previousGroup) {
      menu.addSeparator();
    }
    previousGroup = action.group;

    menu.addItem((item) => {
      const configured = item
        .setTitle(action.label)
        .setSection("trail-action");
      if (action.group === "destructive") configured.setWarning(true);
      return configured.onClick(() => {
        if (action.targets.length > 1) {
          new TrailActionTargetSuggestModal(app, action, request.onSelect).open();
          return;
        }
        invokeMenuSelection(request.onSelect, action.id, action.targets[0]?.id);
      });
    });
  }
}

/** Obsidian owns native context-menu and searchable target-selection mechanics. */
export function createObsidianTrailActionMenuPresenter(app: App): TrailActionMenuPresenter {
  const createMenu = <TActionId extends string>(request: TrailActionMenuRequest<TActionId>) => {
    const menu = new Menu().setNoIcon();
    addActionItems(app, menu, request);
    return menu;
  };

  return {
    showAtMouseEvent<TActionId extends string>(
      event: MouseEvent,
      request: TrailActionMenuRequest<TActionId>,
    ): void {
      createMenu(request).showAtMouseEvent(event);
    },
    showAtPosition<TActionId extends string>(
      position: { readonly x: number; readonly y: number },
      request: TrailActionMenuRequest<TActionId>,
    ): void {
      createMenu(request).showAtPosition(position);
    },
  };
}
