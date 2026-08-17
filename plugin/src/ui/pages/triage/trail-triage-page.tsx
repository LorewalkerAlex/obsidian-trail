import {
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import {
  selectTrailReadableTriageIssueIds,
} from "../../../query/shared/trail-effective-query";
import { selectTrailTriageSourceIssues } from "../../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailTriageIssueRow } from "../../entities/trail-triage-issue-row";
import { runTrailReceipt } from "../../interactions/trail-action";
import { TrailDataIssuePanel } from "../../patterns/trail-feedback";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

export function TrailTriagePage(props: {
  readonly actions: TrailUiActions["triage"];
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
  readonly writable: boolean;
}) {
  const issueIds = useStore(
    props.runtimeStore,
    useShallow(selectTrailReadableTriageIssueIds),
  );
  const sourceIssues = useStore(
    props.runtimeStore,
    useShallow(selectTrailTriageSourceIssues),
  );
  const [draft, setDraft] = useState("");
  const [captureError, setCaptureError] = useState<string>();
  const [managementError, setManagementError] = useState<string>();
  const sourceIsHealthy = sourceIssues.length === 0;

  const submitCapture = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!props.writable || !sourceIsHealthy || draft.trim() === "") return;
    runTrailReceipt(
      () => props.actions.capture(draft),
      setCaptureError,
      () => setDraft(""),
    );
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
              disabled={!props.writable || !sourceIsHealthy}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
              placeholder="What needs your attention?"
              value={draft}
            />
          </label>
          <button
            className="mod-cta trail-capture__button"
            disabled={!props.writable || !sourceIsHealthy || draft.trim() === ""}
            type="submit"
          >
            Capture
          </button>
        </form>
        {captureError !== undefined ? (
          <p className="trail-inline-error" role="alert">{captureError}</p>
        ) : null}
      </section>

      {sourceIssues.length > 0 ? (
        <TrailDataIssuePanel
          issues={sourceIssues.map((issue) => issue.message)}
          message="Trail is showing the last known good state and has paused Triage actions until the Markdown becomes valid again."
          title="Triage.md has a data issue."
        />
      ) : null}

      {managementError !== undefined ? (
        <p className="trail-inline-error trail-management-error" role="alert">
          {managementError}
        </p>
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
              <TrailTriageIssueRow
                actions={props.actions}
                issueId={issueId}
                key={issueId}
                onError={setManagementError}
                runtimeStore={props.runtimeStore}
                sourceIsHealthy={sourceIsHealthy}
                timezone={props.timezone}
                writable={props.writable}
              />
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
