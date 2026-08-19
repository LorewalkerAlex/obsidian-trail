import { useMemo, useState, type ChangeEvent } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { selectTrailSearchResults, type TrailSearchResult } from "../../../query/search/trail-search-query";
import { selectTrailReadableConfiguration } from "../../../query/shared/trail-effective-query";
import { selectTrailTriageSourceIssues } from "../../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailTriageIssueRow } from "../../entities/trail-triage-issue-row";
import { TrailWorkflowIssueRow } from "../../entities/trail-workflow-issue-row";
import { TrailWorkflowIssuePeek } from "../../patterns/trail-workflow-issue-peek";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

function resultLabel(result: TrailSearchResult): string {
  switch (result.kind) {
    case "initiative": return "Initiative";
    case "milestone": return "Milestone";
    case "project": return "Project";
    case "triage-issue": return "Triage";
    case "workflow-issue": return "Workflow Issue";
  }
}

/** Read-only search projection with existing entity interaction surfaces as consumers. */
export function TrailSearchPage(props: {
  readonly actions: Pick<TrailUiActions, "issues" | "triage">;
  readonly onOpenInitiative: (initiativeId: string) => void;
  readonly onOpenProject: (projectId: string) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openIssueId, setOpenIssueId] = useState<string>();
  const [managementError, setManagementError] = useState<string>();
  const configuration = useStore(props.runtimeStore, selectTrailReadableConfiguration);
  const runtimeState = useStore(props.runtimeStore, (state) => state);
  const results = useMemo(
    () => selectTrailSearchResults(runtimeState, query),
    [query, runtimeState],
  );
  const triageSourceIssues = useStore(
    props.runtimeStore,
    useShallow(selectTrailTriageSourceIssues),
  );

  if (configuration === null) return null;
  const normalizedQuery = query.trim();
  const triageSourceIsHealthy = triageSourceIssues.length === 0;

  const openStructuralResult = (result: TrailSearchResult): void => {
    switch (result.kind) {
      case "initiative":
        props.onOpenInitiative(result.entityId);
        return;
      case "project":
        props.onOpenProject(result.entityId);
        return;
      case "milestone":
        if (result.projectId !== undefined) props.onOpenProject(result.projectId);
        return;
      case "triage-issue":
      case "workflow-issue":
        return;
    }
  };

  return (
    <main className="trail-projects trail-search">
      <section className="trail-capture" aria-labelledby="trail-search-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-search-title">Search</h2>
            <p>Find Trail work by title or description.</p>
          </div>
        </div>
        <label className="trail-capture__field">
          <span className="screen-reader-text">Search Trail</span>
          <input
            autoComplete="off"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Search Trail"
            type="search"
            value={query}
          />
        </label>
      </section>

      {managementError === undefined ? null : (
        <p className="trail-inline-error trail-management-error" role="alert">
          {managementError}
        </p>
      )}

      <section className="trail-triage-list" aria-labelledby="trail-search-results-title">
        <div className="trail-section-heading trail-section-heading--list">
          <div>
            <h2 id="trail-search-results-title">Results</h2>
            <p>Exact and title matches appear before description-only matches.</p>
          </div>
          <span className="trail-count" aria-label={`${results.length} search results`}>
            {results.length}
          </span>
        </div>

        {normalizedQuery === "" ? (
          <div className="trail-empty-state">
            <p>Search current Trail work.</p>
            <span>Initiatives, Projects, Milestones, Triage, and Workflow Issues are searchable.</span>
          </div>
        ) : results.length === 0 ? (
          <div className="trail-empty-state">
            <p>No matching Trail work.</p>
            <span>Try another title or a word from the description.</span>
          </div>
        ) : (
          <ol className="trail-issue-list">
            {results.map((result) => {
              switch (result.kind) {
                case "workflow-issue":
                  return (
                    <TrailWorkflowIssueRow
                      actions={props.actions.issues}
                      configuration={configuration}
                      issueId={result.entityId}
                      key={`${result.kind}:${result.entityId}`}
                      onError={setManagementError}
                      onOpenIssue={setOpenIssueId}
                      runtimeStore={props.runtimeStore}
                      writable={props.writable}
                    />
                  );
                case "triage-issue":
                  return (
                    <TrailTriageIssueRow
                      actions={props.actions.triage}
                      issueId={result.entityId}
                      key={`${result.kind}:${result.entityId}`}
                      onError={setManagementError}
                      runtimeStore={props.runtimeStore}
                      sourceIsHealthy={triageSourceIsHealthy}
                      timezone={configuration.temporal.timezone}
                      writable={props.writable}
                    />
                  );
                case "initiative":
                case "milestone":
                case "project":
                  return (
                    <li className="trail-issue-row" key={`${result.kind}:${result.entityId}`}>
                      <div className="trail-issue-row__body">
                        <strong>{result.title}</strong>
                        <span>{resultLabel(result)}</span>
                      </div>
                      <div className="trail-issue-row__actions">
                        <button
                          aria-label={`Open ${result.title}`}
                          onClick={() => openStructuralResult(result)}
                          type="button"
                        >
                          Open
                        </button>
                      </div>
                    </li>
                  );
              }
            })}
          </ol>
        )}
      </section>

      <TrailWorkflowIssuePeek
        actions={props.actions.issues}
        configuration={configuration}
        issueId={openIssueId}
        onError={setManagementError}
        onOpenChange={(open) => {
          if (!open) setOpenIssueId(undefined);
        }}
        open={openIssueId !== undefined}
        runtimeStore={props.runtimeStore}
        writable={props.writable}
      />
    </main>
  );
}
