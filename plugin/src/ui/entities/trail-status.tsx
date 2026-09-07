import type {
  TrailProjectStatusCategory,
  TrailStatusCategory,
} from "../../domain/model/trail-values";

type TrailAccessibleStatusGlyphProps =
  | {
      readonly decorative: true;
      readonly label?: never;
    }
  | {
      readonly decorative?: false;
      readonly label: string;
    };

type TrailIssueStatusGlyphProps = {
  readonly category: TrailStatusCategory;
  readonly entityType?: "issue";
} & TrailAccessibleStatusGlyphProps;

type TrailProjectStatusGlyphProps = {
  readonly category: TrailProjectStatusCategory;
  readonly entityType: "project";
} & TrailAccessibleStatusGlyphProps;

export type TrailStatusGlyphProps =
  | TrailIssueStatusGlyphProps
  | TrailProjectStatusGlyphProps;

function TrailIssueStatusGeometry({ category }: { readonly category: TrailStatusCategory }) {
  if (category === "backlog") {
    return (
      <circle
        className="trail-status-glyph__issue-backlog-ring"
        cx="8"
        cy="8"
        r="5.75"
      />
    );
  }

  if (category === "completed") {
    return (
      <>
        <circle className="trail-status-glyph__issue-fill" cx="8" cy="8" r="5.25" />
        <circle className="trail-status-glyph__issue-ring" cx="8" cy="8" r="6.05" />
        <path className="trail-status-glyph__issue-terminal-mark" d="m5.35 8.1 1.7 1.75 3.65-3.85" />
      </>
    );
  }

  if (category === "canceled") {
    return (
      <>
        <circle className="trail-status-glyph__issue-fill" cx="8" cy="8" r="5.25" />
        <circle className="trail-status-glyph__issue-ring" cx="8" cy="8" r="6.05" />
        <path className="trail-status-glyph__issue-terminal-mark" d="m5.6 5.6 4.8 4.8m0-4.8-4.8 4.8" />
      </>
    );
  }

  return (
    <>
      <circle className="trail-status-glyph__issue-ring" cx="8" cy="8" r="6.05" />
      {category === "started" ? (
        <path
          className="trail-status-glyph__issue-progress"
          d="M8 8V4.2A3.8 3.8 0 0 1 9.17 11.61Z"
        />
      ) : null}
    </>
  );
}

function TrailProjectStatusGeometry({
  category,
}: {
  readonly category: TrailProjectStatusCategory;
}) {
  return (
    <>
      <polygon
        className="trail-status-glyph__project-frame"
        points="8 1.15 13.9 4.55 13.9 11.45 8 14.85 2.1 11.45 2.1 4.55"
      />
      {category === "started" ? (
        <path
          className="trail-status-glyph__project-progress"
          d="M7.75 4.1 11.6 6.3V9.7L7.75 11.9Z"
        />
      ) : null}
      {category === "completed" ? (
        <path className="trail-status-glyph__project-mark" d="m4.75 8.15 2.05 2.1 4.5-4.7" />
      ) : null}
      {category === "canceled" ? (
        <path className="trail-status-glyph__project-mark" d="m5.25 5.25 5.5 5.5m0-5.5-5.5 5.5" />
      ) : null}
    </>
  );
}

export function TrailStatusGlyph(props: TrailStatusGlyphProps) {
  const accessibilityProps = props.decorative === true
    ? { "aria-hidden": true as const }
    : {
        "aria-label": `${props.label} status`,
        role: "img" as const,
      };
  const entityType = props.entityType ?? "issue";

  return (
    <svg
      {...accessibilityProps}
      className="trail-status-glyph"
      data-status-category={props.category}
      data-status-entity-type={entityType}
      viewBox="0 0 16 16"
    >
      {props.entityType === "project" ? (
        <TrailProjectStatusGeometry category={props.category} />
      ) : (
        <TrailIssueStatusGeometry category={props.category} />
      )}
    </svg>
  );
}
