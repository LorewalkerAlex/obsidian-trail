import type { TrailTimestamp } from "../../domain/model/trail-values";

export interface TrailDueDateProps {
  readonly timestamp: TrailTimestamp;
  readonly timezone: string;
}

function formatLongDueDate(
  timestamp: TrailTimestamp,
  timezone: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: timezone,
    year: "numeric",
  }).format(timestamp);
}

function compactDueDateParts(
  timestamp: TrailTimestamp,
  timezone: string,
): { readonly day: string; readonly month: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).formatToParts(timestamp);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
  };
}

export function TrailDueDate({
  timestamp,
  timezone,
}: TrailDueDateProps) {
  const accessibleLabel = formatLongDueDate(timestamp, timezone);
  const compact = compactDueDateParts(timestamp, timezone);

  return (
    <time
      aria-label={accessibleLabel}
      className="trail-due-date"
      dateTime={new Date(timestamp).toISOString()}
      title={accessibleLabel}
    >
      <span className="trail-due-date__month">{compact.month} </span>
      <span className="trail-due-date__day">{compact.day}</span>
    </time>
  );
}
