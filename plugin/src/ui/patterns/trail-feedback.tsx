export interface TrailStatusPanelProps {
  readonly message: string;
  readonly title: string;
  readonly tone?: "error" | "warning";
}

export function TrailStatusPanel({
  message,
  title,
  tone,
}: TrailStatusPanelProps) {
  const className = tone === undefined
    ? "trail-status-panel"
    : `trail-status-panel trail-status-panel--${tone}`;

  return (
    <section className={className} role={tone === "error" ? "alert" : "status"}>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export interface TrailDataIssuePanelProps {
  readonly issues: readonly string[];
  readonly message: string;
  readonly title: string;
}

export function TrailDataIssuePanel({
  issues,
  message,
  title,
}: TrailDataIssuePanelProps) {
  return (
    <section className="trail-data-issue" role="alert">
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${index}:${issue}`}>{issue}</li>
        ))}
      </ul>
    </section>
  );
}
