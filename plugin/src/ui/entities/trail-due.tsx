import type { TrailTimestamp } from "../../domain/model/trail-values";

export interface TrailDueDateProps {
  readonly timestamp: TrailTimestamp;
  readonly timezone: string;
}

function formatDueDate(
  timestamp: TrailTimestamp,
  timezone: string,
  dateStyle: "long" | "short",
): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: dateStyle === "long" ? "long" : "short",
    timeZone: timezone,
    ...(dateStyle === "long" ? { year: "numeric" as const } : {}),
  }).format(timestamp);
}

export function TrailDueDate({
  timestamp,
  timezone,
}: TrailDueDateProps) {
  const accessibleLabel = formatDueDate(timestamp, timezone, "long");

  return (
    <time
      aria-label={accessibleLabel}
      className="trail-due-date"
      dateTime={new Date(timestamp).toISOString()}
      title={accessibleLabel}
    >
      {formatDueDate(timestamp, timezone, "short")}
    </time>
  );
}
