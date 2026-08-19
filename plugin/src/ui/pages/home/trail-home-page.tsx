import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useStore } from "zustand";

import type { TrailWeeklyNoteSnapshot } from "../../../application/workspace/trail-weekly-note-application";
import { selectTrailHomeSummary } from "../../../query/home/trail-home-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

function formatDateTime(epochMilliseconds: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(epochMilliseconds);
}

function formatCycleEnd(epochMilliseconds: number, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(epochMilliseconds);
}

export function TrailHomePage(props: {
  readonly actions: TrailUiActions["weeklyNote"];
  readonly onOpenCycles: () => void;
  readonly onOpenProjects: () => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly timezone: string;
  readonly writable: boolean;
}) {
  const runtimeState = useStore(props.runtimeStore, (state) => state);
  const summary = useMemo(() => selectTrailHomeSummary(runtimeState), [runtimeState]);
  const [clock, setClock] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<TrailWeeklyNoteSnapshot>();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void props.actions.load().then(
      (loaded) => {
        if (!active) return;
        setSnapshot(loaded);
        setDraft(loaded.current);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [props.actions]);

  const runWeeklyAction = async (
    action: () => Promise<TrailWeeklyNoteSnapshot>,
  ): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      const next = await action();
      setSnapshot(next);
      setDraft(next.current);
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setBusy(false);
    }
  };

  const saveCurrent = (): void => {
    void runWeeklyAction(() => props.actions.replaceCurrent(
      snapshot?.current ?? "",
      draft,
    ));
  };

  const archiveCurrent = (): void => {
    void runWeeklyAction(() => props.actions.archiveCurrent(
      snapshot?.current ?? "",
      draft,
    ));
  };

  const archiveCount = snapshot?.archives.length ?? 0;
  const controlsDisabled = !props.writable || loading || busy;

  return (
    <main className="trail-triage">
      <section className="trail-capture" aria-labelledby="trail-home-today-title">
        <div className="trail-section-heading">
          <div>
            <h2 id="trail-home-today-title">Today</h2>
            <p>{formatDateTime(clock, props.timezone)}</p>
          </div>
        </div>
      </section>

      <section className="trail-project-workspace" aria-labelledby="trail-home-cycle-title">
        <div className="trail-project-workspace__header">
          <div>
            <h2 id="trail-home-cycle-title">Current Cycle</h2>
            {summary.currentCycle === undefined ? (
              <p>No Cycle is open.</p>
            ) : (
              <p>
                {summary.currentCycle.issueCount} Issues · planned end {formatCycleEnd(
                  summary.currentCycle.plannedEnd,
                  props.timezone,
                )}
              </p>
            )}
          </div>
          <button onClick={props.onOpenCycles} type="button">Open Cycles</button>
        </div>
      </section>

      <section className="trail-project-workspace" aria-labelledby="trail-home-work-title">
        <div className="trail-project-workspace__header">
          <div>
            <h2 id="trail-home-work-title">Work Structure</h2>
            <p>
              {summary.initiativeCount} Initiatives · {summary.projectCount} Projects
            </p>
          </div>
          <button onClick={props.onOpenProjects} type="button">Open Projects</button>
        </div>
      </section>

      <section className="trail-project-workspace" aria-labelledby="trail-home-weekly-title">
        <div className="trail-project-workspace__header">
          <div>
            <h2 id="trail-home-weekly-title">Weekly Note</h2>
            <p>{archiveCount} archived updates</p>
          </div>
        </div>

        {loading ? <p>Loading Weekly Note…</p> : null}
        {!loading ? (
          <label className="trail-dialog__field">
            <span>Current</span>
            <textarea
              disabled={controlsDisabled}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
              rows={8}
              value={draft}
            />
          </label>
        ) : null}

        {error !== undefined ? (
          <p className="trail-inline-error" role="alert">{error}</p>
        ) : null}

        {!loading ? (
          <div className="trail-issue-editor__actions">
            <button
              disabled={controlsDisabled || draft === (snapshot?.current ?? "")}
              onClick={saveCurrent}
              type="button"
            >
              Save Current
            </button>
            <button
              disabled={controlsDisabled || draft.trim() === ""}
              onClick={archiveCurrent}
              type="button"
            >
              Archive Current
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
