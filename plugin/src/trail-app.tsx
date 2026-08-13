import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { TrailTriageIssue } from "./domain/trail-issue";
import {
  selectEffectiveTriageIssueById,
  selectEffectiveTriageIssueIds,
  selectIsTriageIssuePending,
  type TrailRuntimeStore,
} from "./domain/trail-runtime";
import type { TriageCaptureReceipt } from "./domain/trail-triage-intake";

export interface TrailAppProps {
  readonly onCapture: (title: string) => TriageCaptureReceipt;
  readonly runtimeStore: TrailRuntimeStore;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Trail error.";
}

function formatDue(due: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(due));
}

export function TrailApp({
  onCapture,
  runtimeStore,
}: TrailAppProps) {
  const availability = useStore(
    runtimeStore,
    (state) => state.availability,
  );

  return (
    <div className="trail-app">
      <header className="trail-app__header">
        <div>
          <p className="trail-app__eyebrow">Trail</p>
          <h1 className="trail-app__title">Triage</h1>
        </div>
        <p className="trail-app__subtitle">
          Capture now. Decide what it becomes when you are ready.
        </p>
      </header>

      {availability.kind === "idle" || availability.kind === "initializing" ? (
        <StatusPanel
          title="Loading Trail"
          message="Validating the Formal workspace and rebuilding runtime state."
        />
      ) : null}

      {availability.kind === "blocked" ? (
        <StatusPanel
          title="Trail needs attention"
          message={availability.message}
          tone="warning"
        />
      ) : null}

      {availability.kind === "error" ? (
        <StatusPanel
          title="Trail could not start"
          message={availability.message}
          tone="error"
        />
      ) : null}

      {availability.kind === "ready" ? (
        <TriagePage
          onCapture={onCapture}
          runtimeStore={runtimeStore}
          timezone={availability.timezone}
        />
      ) : null}
    </div>
  );
}

interface StatusPanelProps {
  readonly message: string;
  readonly title: string;
  readonly tone?: "error" | "warning";
}

function StatusPanel({
  message,
  title,
  tone,
}: StatusPanelProps) {
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

interface TriagePageProps {
  readonly onCapture: TrailAppProps["onCapture"];
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}

function TriagePage({
  onCapture,
  runtimeStore,
  timezone,
}: TriagePageProps) {
  const sourceIssues = useStore(
    runtimeStore,
    (state) => state.committed.sourceIssues,
  );
  const issueIds = useStore(
    runtimeStore,
    useShallow(selectEffectiveTriageIssueIds),
  );
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string>();
  const sourceIsValid = sourceIssues.length === 0;

  const submitCapture = (
    event: SyntheticEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    if (!sourceIsValid || draft.trim() === "") {
      return;
    }

    try {
      const receipt = onCapture(draft);
      setDraft("");
      setCaptureError(undefined);

      void receipt.completion.catch((error: unknown) => {
        setCaptureError(errorMessage(error));
      });
    } catch (error: unknown) {
      setCaptureError(errorMessage(error));
    }
  };

  return (
    <main className="trail-triage">
      <section className="trail-capture" aria-labelledby="trail-capture-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-capture-title">Quick Capture</h2>
            <p>New captures return to you in seven calendar days by default.</p>
          </div>
        </div>

        <form className="trail-capture__form" onSubmit={submitCapture}>
          <label className="trail-capture__field">
            <span className="screen-reader-text">Capture title</span>
            <input
              autoComplete="off"
              disabled={!sourceIsValid}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setDraft(event.target.value);
              }}
              placeholder="What needs your attention?"
              value={draft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!sourceIsValid || draft.trim() === ""}
            type="submit"
          >
            Capture
          </button>
        </form>

        {captureError !== undefined ? (
          <p className="trail-inline-error" role="alert">
            {captureError}
          </p>
        ) : null}
      </section>

      {sourceIssues.length > 0 ? (
        <section className="trail-data-issue" role="alert">
          <div>
            <strong>Triage.md has a data issue.</strong>
            <p>
              Trail is showing the last known good state and has paused Quick Capture
              until the Markdown becomes valid again.
            </p>
          </div>
          <ul>
            {sourceIssues.map((issue) => (
              <li key={`${issue.code}:${issue.offset ?? ""}:${issue.objectId ?? ""}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="trail-triage-list" aria-labelledby="trail-list-title">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-list-title">Captured</h2>
            <p>Due-first, then stable identity.</p>
          </div>
          <span className="trail-count" aria-label={`${issueIds.length} captured issues`}>
            {issueIds.length}
          </span>
        </div>

        {issueIds.length === 0 ? (
          <div className="trail-empty-state">
            <p>Nothing is waiting in Triage.</p>
            <span>Your next capture will appear here immediately.</span>
          </div>
        ) : (
          <ol className="trail-issue-list">
            {issueIds.map((issueId) => (
              <TriageIssueRow
                issueId={issueId}
                key={issueId}
                runtimeStore={runtimeStore}
                timezone={timezone}
              />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

interface TriageIssueRowProps {
  readonly issueId: string;
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
}

function TriageIssueRow({
  issueId,
  runtimeStore,
  timezone,
}: TriageIssueRowProps) {
  const issue = useStore(
    runtimeStore,
    (state) => selectEffectiveTriageIssueById(state, issueId),
  );
  const isPending = useStore(
    runtimeStore,
    (state) => selectIsTriageIssuePending(state, issueId),
  );

  if (issue === undefined) {
    return null;
  }

  return (
    <li
      className={isPending ? "trail-issue-row is-pending" : "trail-issue-row"}
      data-pending={isPending ? "true" : undefined}
    >
      <div className="trail-issue-row__body">
        <strong className="trail-issue-row__title">{issue.title}</strong>
        {issue.description !== undefined ? (
          <p className="trail-issue-row__description">{issue.description}</p>
        ) : null}
      </div>
      <IssueDue issue={issue} timezone={timezone} />
    </li>
  );
}

function IssueDue({
  issue,
  timezone,
}: {
  readonly issue: TrailTriageIssue;
  readonly timezone: string;
}) {
  return (
    <time
      className="trail-issue-row__due"
      dateTime={new Date(issue.due).toISOString()}
      title={`Due in ${timezone}`}
    >
      {formatDue(issue.due, timezone)}
    </time>
  );
}
