import { useState } from "react";

import type { TrailEstimate } from "../../domain/model/trail-values";
import { TRAIL_ESTIMATE_PRESENTATION_VALUES, getTrailEstimatePresentation } from "./trail-estimate";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";

export interface TrailEstimatePropertySelectProps {
  readonly disabled?: boolean;
  readonly layer?: "menu" | "modal-child";
  readonly onValueChange: (value: TrailEstimate | undefined) => void;
  readonly required?: boolean;
  readonly value: TrailEstimate | undefined;
}

/** Shared Estimate property picker used by creation and stable Issue editing surfaces. */
export function TrailEstimatePropertySelect({
  disabled = false,
  layer = "menu",
  onValueChange,
  required = false,
  value,
}: TrailEstimatePropertySelectProps) {
  const [open, setOpen] = useState(false);
  const presentation = getTrailEstimatePresentation(value);
  const choose = (nextValue: TrailEstimate | undefined) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label="Estimate"
      layer={layer}
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Estimate: ${presentation.label}`}
          aria-haspopup="dialog"
          aria-required={required || undefined}
          disabled={disabled}
        >
          {presentation.shortLabel === "" ? presentation.label : presentation.shortLabel}
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Estimate</div>
        {TRAIL_ESTIMATE_PRESENTATION_VALUES
          .filter((estimate) => estimate !== undefined || !required)
          .map((estimate) => {
            const option = getTrailEstimatePresentation(estimate);
            return (
              <button
                className="trail-view-popover__item"
                key={estimate ?? "none"}
                onClick={() => choose(estimate)}
                type="button"
              >
                <span>{option.label}</span>
                <span
                  aria-hidden="true"
                  className="trail-view-popover__check"
                  data-visible={estimate === value ? "true" : "false"}
                >
                  ✓
                </span>
              </button>
            );
          })}
      </div>
    </TrailViewPopover>
  );
}
