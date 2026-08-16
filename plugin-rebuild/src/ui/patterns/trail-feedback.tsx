export function TrailStatusPanel(props: {
  readonly message: string;
  readonly title: string;
  readonly tone?: "error" | "info";
}) {
  return (
    <section
      className={`trail-status-panel${props.tone === "error" ? " is-error" : ""}`}
      role={props.tone === "error" ? "alert" : "status"}
    >
      <strong>{props.title}</strong>
      <p>{props.message}</p>
    </section>
  );
}

export function TrailDataIssuePanel(props: {
  readonly issues: readonly string[];
  readonly message: string;
  readonly title: string;
}) {
  return (
    <section className="trail-data-issue" role="alert">
      <strong>{props.title}</strong>
      <p>{props.message}</p>
      <ul>
        {props.issues.map((issue, index) => (
          <li key={`${index}:${issue}`}>{issue}</li>
        ))}
      </ul>
    </section>
  );
}
