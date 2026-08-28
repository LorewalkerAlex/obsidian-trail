import type { ChangeEvent } from "react";

import {
  TRAIL_ESTIMATES,
  type TrailEstimate,
} from "../../domain/model/trail-values";
import { isTrailEstimate } from "../../domain/validation/trail-value-validation";

const ESTIMATE_LABELS: Readonly<Record<TrailEstimate, string>> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra Large",
};

const ESTIMATE_SHORT_LABELS: Readonly<Record<TrailEstimate, string>> = {
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
};

export function trailEstimateLabel(estimate: TrailEstimate): string {
  return ESTIMATE_LABELS[estimate];
}

export function trailEstimateShortLabel(estimate: TrailEstimate): string {
  return ESTIMATE_SHORT_LABELS[estimate];
}

export function TrailEstimatePicker(props: {
  readonly ariaLabel: string;
  readonly disabled?: boolean;
  readonly emptyLabel?: string;
  readonly onChange: (estimate: TrailEstimate | undefined) => void;
  readonly value?: TrailEstimate;
}) {
  return (
    <select
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        if (value === "") {
          props.onChange(undefined);
        } else if (isTrailEstimate(value)) {
          props.onChange(value);
        }
      }}
      value={props.value ?? ""}
    >
      <option value="">{props.emptyLabel ?? "No estimate"}</option>
      {TRAIL_ESTIMATES.map((estimate) => (
        <option key={estimate} value={estimate}>
          {trailEstimateShortLabel(estimate)} · {trailEstimateLabel(estimate)}
        </option>
      ))}
    </select>
  );
}
