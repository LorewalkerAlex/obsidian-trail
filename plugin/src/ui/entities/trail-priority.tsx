import {
  TRAIL_PRIORITIES,
  type TrailPriority,
} from "../../domain/model/trail-values";

export type TrailPriorityGlyphKind = "none" | TrailPriority;

export interface TrailPriorityPresentation {
  readonly accessibleLabel: string;
  readonly glyphKind: TrailPriorityGlyphKind;
  readonly label: string;
}

const TRAIL_PRIORITY_PRESENTATIONS = {
  urgent: {
    accessibleLabel: "Urgent priority",
    glyphKind: "urgent",
    label: "Urgent",
  },
  high: {
    accessibleLabel: "High priority",
    glyphKind: "high",
    label: "High",
  },
  medium: {
    accessibleLabel: "Medium priority",
    glyphKind: "medium",
    label: "Medium",
  },
  low: {
    accessibleLabel: "Low priority",
    glyphKind: "low",
    label: "Low",
  },
} as const satisfies Record<TrailPriority, TrailPriorityPresentation>;

const TRAIL_NO_PRIORITY_PRESENTATION = {
  accessibleLabel: "No priority",
  glyphKind: "none",
  label: "No priority",
} as const satisfies TrailPriorityPresentation;

export const TRAIL_PRIORITY_PRESENTATION_VALUES = [
  undefined,
  ...TRAIL_PRIORITIES,
] as const satisfies readonly (TrailPriority | undefined)[];

export function getTrailPriorityPresentation(
  priority: TrailPriority | undefined,
): TrailPriorityPresentation {
  return priority === undefined
    ? TRAIL_NO_PRIORITY_PRESENTATION
    : TRAIL_PRIORITY_PRESENTATIONS[priority];
}

export interface TrailPriorityGlyphProps {
  readonly decorative?: boolean;
  readonly priority: TrailPriority | undefined;
}

function TrailPriorityBars({ priority }: { readonly priority: "high" | "low" | "medium" }) {
  const activeBars = priority === "low" ? 1 : priority === "medium" ? 2 : 3;

  return (
    <>
      <rect
        className="trail-priority-glyph__bar"
        data-active={activeBars >= 1}
        height="4"
        rx="1"
        width="2.4"
        x="1.8"
        y="9.5"
      />
      <rect
        className="trail-priority-glyph__bar"
        data-active={activeBars >= 2}
        height="7"
        rx="1"
        width="2.4"
        x="6.8"
        y="6.5"
      />
      <rect
        className="trail-priority-glyph__bar"
        data-active={activeBars >= 3}
        height="10"
        rx="1"
        width="2.4"
        x="11.8"
        y="3.5"
      />
    </>
  );
}

export function TrailPriorityGlyph({
  decorative = false,
  priority,
}: TrailPriorityGlyphProps) {
  const presentation = getTrailPriorityPresentation(priority);
  const accessibilityProps = decorative
    ? { "aria-hidden": true as const }
    : {
        "aria-label": presentation.accessibleLabel,
        role: "img" as const,
      };

  return (
    <svg
      {...accessibilityProps}
      className="trail-priority-glyph"
      data-priority={presentation.glyphKind}
      viewBox="0 0 16 16"
    >
      {presentation.glyphKind === "none" ? (
        <>
          <circle cx="4" cy="8" r="1.15" />
          <circle cx="8" cy="8" r="1.15" />
          <circle cx="12" cy="8" r="1.15" />
        </>
      ) : presentation.glyphKind === "urgent" ? (
        <>
          <rect
            className="trail-priority-glyph__urgent-frame"
            height="10.5"
            rx="3"
            width="10.5"
            x="2.75"
            y="2.75"
          />
          <path
            className="trail-priority-glyph__urgent-mark"
            d="M8 5.25v4.1M8 11.4v.1"
          />
        </>
      ) : (
        <TrailPriorityBars priority={presentation.glyphKind} />
      )}
    </svg>
  );
}
