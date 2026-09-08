import {
  TRAIL_ESTIMATES,
  type TrailEstimate,
} from "../../domain/model/trail-values";

export const TRAIL_ESTIMATE_PRESENTATION_VALUES = [
  undefined,
  ...TRAIL_ESTIMATES,
] as const satisfies readonly (TrailEstimate | undefined)[];

const ESTIMATE_PRESENTATION: Readonly<Record<TrailEstimate, {
  readonly label: string;
  readonly shortLabel: string;
}>> = {
  large: { label: "Large", shortLabel: "L" },
  medium: { label: "Medium", shortLabel: "M" },
  small: { label: "Small", shortLabel: "S" },
  xlarge: { label: "Extra large", shortLabel: "XL" },
};

export function getTrailEstimatePresentation(estimate: TrailEstimate | undefined): {
  readonly label: string;
  readonly shortLabel: string;
} {
  return estimate === undefined
    ? { label: "No estimate", shortLabel: "" }
    : ESTIMATE_PRESENTATION[estimate];
}

export function TrailEstimateValue({
  estimate,
}: {
  readonly estimate: TrailEstimate | undefined;
}) {
  if (estimate === undefined) return null;
  const presentation = getTrailEstimatePresentation(estimate);
  return (
    <span
      aria-label={`${presentation.label} estimate`}
      className="trail-estimate-value"
      title={`${presentation.label} estimate`}
    >
      {presentation.shortLabel}
    </span>
  );
}
