import type { TrailStatusCategory } from "../../domain/model/trail-values";

export type TrailStatusGlyphProps = {
  readonly category: TrailStatusCategory;
} & (
  | {
      readonly decorative: true;
      readonly label?: never;
    }
  | {
      readonly decorative?: false;
      readonly label: string;
    }
);

export function TrailStatusGlyph(props: TrailStatusGlyphProps) {
  const accessibilityProps = props.decorative === true
    ? { "aria-hidden": true as const }
    : {
        "aria-label": `${props.label} status`,
        role: "img" as const,
      };

  return (
    <svg
      {...accessibilityProps}
      className="trail-status-glyph"
      data-status-category={props.category}
      viewBox="0 0 16 16"
    >
      <circle className="trail-status-glyph__ring" cx="8" cy="8" r="5.6" />
      {props.category === "started" ? (
        <circle
          className="trail-status-glyph__progress"
          cx="8"
          cy="8"
          r="5.6"
          transform="rotate(-90 8 8)"
        />
      ) : null}
      {props.category === "completed" ? (
        <path className="trail-status-glyph__check" d="m5.1 8 1.8 1.9 4-4.2" />
      ) : null}
      {props.category === "canceled" ? (
        <path className="trail-status-glyph__cancel" d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" />
      ) : null}
    </svg>
  );
}
