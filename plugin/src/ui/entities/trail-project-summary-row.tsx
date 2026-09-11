import type { KeyboardEventHandler, MouseEventHandler } from "react";

import type {
  TrailPriority,
  TrailProjectStatusCategory,
  TrailTimestamp,
} from "../../domain/model/trail-values";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailProgress } from "../primitives/trail-progress";
import { TrailDueDate } from "./trail-due";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "./trail-priority";
import { TrailStatusGlyph } from "./trail-status";

export type TrailProjectSummaryProgress =
  | {
      readonly max: number;
      readonly unavailable?: false;
      readonly value: number;
    }
  | {
      readonly max?: never;
      readonly unavailable: true;
      readonly value?: never;
    };

export interface TrailProjectSummaryRowProps {
  readonly due?: TrailTimestamp;
  readonly highlighted?: boolean;
  readonly onActivate?: () => void;
  readonly onContextMenu?: MouseEventHandler<HTMLDivElement>;
  readonly onSelectionChange?: (selected: boolean, extendRange: boolean) => void;
  readonly priority: TrailPriority | undefined;
  readonly progress: TrailProjectSummaryProgress;
  readonly selected?: boolean;
  readonly statusCategory: TrailProjectStatusCategory;
  readonly statusLabel: string;
  readonly timezone: string;
  readonly title: string;
}

export function TrailProjectSummaryRow({
  due,
  highlighted = false,
  onActivate,
  onContextMenu,
  onSelectionChange,
  priority,
  progress,
  selected = false,
  statusCategory,
  statusLabel,
  timezone,
  title,
}: TrailProjectSummaryRowProps) {
  const priorityPresentation = getTrailPriorityPresentation(priority);
  const terminal = statusCategory === "completed" || statusCategory === "canceled";
  const activate = () => onActivate?.();
  const handleKeyDownCapture: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (
      event.key.toLowerCase() !== "x"
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || onSelectionChange === undefined
      || event.target instanceof HTMLInputElement
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSelectionChange(!selected, false);
  };

  return (
    <TrailCollectionRow
      data-project-summary-row="true"
      data-terminal={terminal ? "true" : undefined}
      highlighted={highlighted}
      leading={(
        <TrailStatusGlyph
          category={statusCategory}
          entityType="project"
          label={statusLabel}
        />
      )}
      onClick={onActivate === undefined ? undefined : activate}
      onContextMenu={onContextMenu}
      onKeyDownCapture={onSelectionChange === undefined ? undefined : handleKeyDownCapture}
      selected={selected}
      selectionControl={onSelectionChange === undefined ? undefined : (
        <TrailCheckbox
          checked={selected}
          label={selected ? `Deselect ${title}` : `Select ${title}`}
          onClick={(event) => onSelectionChange(!selected, event.shiftKey)}
          readOnly
        />
      )}
    >
      <div className="trail-project-summary-row__content">
        {onActivate === undefined ? (
          <span className="trail-project-summary-row__title">{title}</span>
        ) : (
          <button
            className="trail-project-summary-row__title trail-project-summary-row__title-button"
            onClick={activate}
            type="button"
          >
            {title}
          </button>
        )}
        <span
          className="trail-project-summary-row__priority"
          title={priorityPresentation.label}
        >
          <TrailPriorityGlyph priority={priority} />
        </span>
        <span className="trail-project-summary-row__progress">
          {progress.unavailable === true ? (
            <TrailProgress
              density="micro"
              label={`${title} progress`}
              unavailable
            />
          ) : (
            <TrailProgress
              density="micro"
              label={`${title} progress`}
              max={progress.max}
              value={progress.value}
            />
          )}
        </span>
        <span className="trail-project-summary-row__due">
          {due === undefined ? (
            <span aria-label="No due date">—</span>
          ) : (
            <TrailDueDate timestamp={due} timezone={timezone} />
          )}
        </span>
      </div>
    </TrailCollectionRow>
  );
}
