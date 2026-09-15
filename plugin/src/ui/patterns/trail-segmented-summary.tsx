export interface TrailSegmentedSummarySegment {
  readonly id: string;
  readonly label: string;
  readonly tone?: "attention" | "default";
  readonly value: number;
}

export type TrailSegmentedSummaryAppearance = "framed" | "inline";

function segmentContent(
  appearance: TrailSegmentedSummaryAppearance,
  segment: TrailSegmentedSummarySegment,
) {
  return appearance === "framed" ? (
    <>
      <span>{segment.label}</span>
      <strong>{segment.value}</strong>
    </>
  ) : (
    <>
      <strong>{segment.value}</strong>
      <span>{segment.label}</span>
    </>
  );
}

export function TrailSegmentedSummary({
  appearance = "framed",
  label,
  segments,
}: {
  readonly appearance?: TrailSegmentedSummaryAppearance;
  readonly label: string;
  readonly segments: readonly TrailSegmentedSummarySegment[];
}) {
  return (
    <span
      aria-label={label}
      className={`trail-segmented-summary trail-segmented-summary--${appearance}`}
      role="group"
    >
      {segments.map((segment) => (
        <span
          aria-label={`${segment.label}: ${segment.value}`}
          className="trail-segmented-summary__segment"
          data-tone={segment.tone ?? "default"}
          data-value={segment.value}
          key={segment.id}
        >
          {segmentContent(appearance, segment)}
        </span>
      ))}
    </span>
  );
}
