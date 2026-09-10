export interface TrailActionMenuTarget {
  readonly id: string;
  readonly label: string;
}

export interface TrailActionMenuItem<TActionId extends string = string> {
  readonly group: string;
  readonly id: TActionId;
  readonly label: string;
  readonly targets: readonly TrailActionMenuTarget[];
}

export interface TrailActionMenuRequest<TActionId extends string = string> {
  readonly items: readonly TrailActionMenuItem<TActionId>[];
  readonly onSelect: (actionId: TActionId, targetId?: string) => void | Promise<void>;
  readonly unavailableReason?: string;
}

export interface TrailActionMenuPosition {
  readonly x: number;
  readonly y: number;
}

/** Host-owned menu mechanics behind a small UI-facing interaction contract. */
export interface TrailActionMenuPresenter {
  showAtMouseEvent<TActionId extends string>(
    event: MouseEvent,
    request: TrailActionMenuRequest<TActionId>,
  ): void;
  showAtPosition<TActionId extends string>(
    position: TrailActionMenuPosition,
    request: TrailActionMenuRequest<TActionId>,
  ): void;
}
