import type {
  MouseEventHandler,
  ReactNode,
} from "react";

import type { TrailPriority } from "../../domain/model/trail-values";
import { TrailCollectionRow } from "../patterns/trail-collection-row";
import { TrailCheckbox } from "../primitives/trail-checkbox";
import {
  getTrailPriorityPresentation,
  TrailPriorityGlyph,
} from "./trail-priority";

export interface TrailTriageRowProps {
  readonly highlighted?: boolean;
  readonly labels?: ReactNode;
  readonly onActivate?: () => void;
  readonly onSelectedChange?: (selected: boolean) => void;
  readonly priority: TrailPriority | undefined;
  readonly reviewDue: ReactNode;
  readonly selected?: boolean;
  readonly title: string;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("a, button, input, select, textarea, [role='button'], [role='combobox']") !== null;
}

export function TrailTriageRow({
  highlighted = false,
  labels,
  onActivate,
  onSelectedChange,
  priority,
  reviewDue,
  selected = false,
  title,
}: TrailTriageRowProps) {
  const priorityPresentation = getTrailPriorityPresentation(priority);
  const handleRowClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (isInteractiveTarget(event.target)) return;
    onActivate?.();
  };
  const handleTitleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onActivate?.();
  };

  return (
    <TrailCollectionRow
      data-triage-row="true"
      highlighted={highlighted}
      leading={(
        <span
          className="trail-triage-row__priority"
          title={priorityPresentation.label}
        >
          <TrailPriorityGlyph priority={priority} />
        </span>
      )}
      onClick={onActivate === undefined ? undefined : handleRowClick}
      selected={selected}
      selectionControl={onSelectedChange === undefined ? undefined : (
        <TrailCheckbox
          checked={selected}
          label={`Select ${title}`}
          onChange={(event) => onSelectedChange(event.currentTarget.checked)}
        />
      )}
    >
      <div className="trail-triage-row__content">
        {onActivate === undefined ? (
          <span className="trail-triage-row__title">{title}</span>
        ) : (
          <button
            className="trail-triage-row__title trail-triage-row__title-button"
            onClick={handleTitleClick}
            type="button"
          >
            {title}
          </button>
        )}
        {labels === undefined || labels === null ? null : (
          <span className="trail-triage-row__labels">{labels}</span>
        )}
        <span className="trail-triage-row__due">{reviewDue}</span>
      </div>
    </TrailCollectionRow>
  );
}
