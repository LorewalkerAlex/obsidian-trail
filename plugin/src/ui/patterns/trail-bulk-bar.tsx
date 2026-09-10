import type { MouseEventHandler, ReactNode } from "react";

import { TrailIconButton } from "../primitives/trail-icon-button";

function TrailMoreIcon() {
  return (
    <svg aria-hidden="true" className="trail-bulk-bar__icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12.5" cy="8" r="1" />
    </svg>
  );
}

function TrailClearIcon() {
  return (
    <svg aria-hidden="true" className="trail-bulk-bar__icon" viewBox="0 0 16 16">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
    </svg>
  );
}

export interface TrailBulkBarProps {
  readonly actions?: ReactNode;
  readonly count: number;
  readonly onClear: () => void;
  readonly onOverflow?: MouseEventHandler<HTMLButtonElement>;
}

/** Mechanical selection bar; Selection and Action Registry own scope and legality. */
export function TrailBulkBar({
  actions,
  count,
  onClear,
  onOverflow,
}: TrailBulkBarProps) {
  return (
    <div aria-label="Selection actions" className="trail-bulk-bar" role="toolbar">
      <span className="trail-bulk-bar__count">{count} selected</span>
      {actions === undefined || actions === null ? null : (
        <div className="trail-bulk-bar__actions">{actions}</div>
      )}
      {onOverflow === undefined ? null : (
        <TrailIconButton
          icon={<TrailMoreIcon />}
          label="More selection actions"
          onClick={onOverflow}
        />
      )}
      <TrailIconButton
        icon={<TrailClearIcon />}
        label="Clear selection"
        onClick={onClear}
      />
    </div>
  );
}
