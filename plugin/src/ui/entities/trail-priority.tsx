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
        height="4.6"
        rx="1"
        width="3"
        x="1"
        y="10"
      />
      <rect
        className="trail-priority-glyph__bar"
        data-active={activeBars >= 2}
        height="8.7"
        rx="1"
        width="3"
        x="6.5"
        y="5.9"
      />
      <rect
        className="trail-priority-glyph__bar"
        data-active={activeBars >= 3}
        height="13.2"
        rx="1"
        width="3"
        x="12"
        y="1.4"
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
        <path
          className="trail-priority-glyph__none-mark"
          d="M.9 8h3M6.5 8h3M12.1 8h3"
        />
      ) : presentation.glyphKind === "urgent" ? (
        <>
          <rect
            className="trail-priority-glyph__urgent-block"
            height="13.4"
            rx="2.15"
            width="13.4"
            x="1.3"
            y="1.3"
          />
          <rect
            className="trail-priority-glyph__urgent-mark"
            height="4.8"
            rx="0.7"
            width="1.4"
            x="7.3"
            y="3.8"
          />
          <circle
            className="trail-priority-glyph__urgent-dot"
            cx="8"
            cy="11.45"
            r="0.85"
          />
        </>
      ) : (
        <TrailPriorityBars priority={presentation.glyphKind} />
      )}
    </svg>
  );
}
