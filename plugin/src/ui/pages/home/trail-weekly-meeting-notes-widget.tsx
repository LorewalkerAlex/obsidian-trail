import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import type { TrailWeeklyNoteSnapshot } from "../../../application/workspace/trail-weekly-note-application";
import { TrailMarkdownContent, type TrailMarkdownRender } from "../../patterns/trail-markdown-content";
import { TrailButton } from "../../primitives/trail-button";
import { TrailTextarea } from "../../primitives/trail-textarea";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailHomeWidgetFrame } from "./trail-home-widget-frame";

type TrailWeeklyMeetingNotesActions = TrailUiActions["weeklyNote"];
type TrailWeeklyMeetingNotesMode = "current" | "edit" | "history";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function latestArchiveIndex(snapshot: TrailWeeklyNoteSnapshot): number | null {
  return snapshot.archives.length === 0 ? null : snapshot.archives.length - 1;
}

function TrailWeeklyNotesMarkdown({
  markdown,
  renderMarkdown,
}: {
  readonly markdown: string;
  readonly renderMarkdown: TrailMarkdownRender;
}) {
  return markdown === "" ? (
    <div className="trail-home-weekly-notes__empty">No current notes yet.</div>
  ) : (
    <TrailMarkdownContent
      className="trail-home-weekly-notes__markdown"
      markdown={markdown}
      renderMarkdown={renderMarkdown}
    />
  );
}

export function TrailWeeklyMeetingNotesWidget({
  actions,
  renderMarkdown,
}: {
  readonly actions: TrailWeeklyMeetingNotesActions;
  readonly renderMarkdown: TrailMarkdownRender;
}) {
  const [loadRevision, setLoadRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<TrailWeeklyNoteSnapshot | null>(null);
  const [mode, setMode] = useState<TrailWeeklyMeetingNotesMode>("current");
  const [draft, setDraft] = useState("");
  const [selectedArchiveIndex, setSelectedArchiveIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void actions.load().then((loaded) => {
      if (!active) return;
      setSnapshot(loaded);
      setSelectedArchiveIndex(latestArchiveIndex(loaded));
      setDraft(loaded.current);
      setMode("current");
    }).catch((loadError: unknown) => {
      if (!active) return;
      setSnapshot(null);
      setError(errorMessage(loadError));
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [actions, loadRevision]);

  const applySnapshot = (next: TrailWeeklyNoteSnapshot) => {
    setSnapshot(next);
    setSelectedArchiveIndex(latestArchiveIndex(next));
    setDraft(next.current);
    setError(null);
  };

  const saveCurrent = async () => {
    if (snapshot === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await actions.replaceCurrent(snapshot.current, draft);
      applySnapshot(next);
      setMode("current");
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  };

  const archiveCurrent = async () => {
    if (snapshot === null || snapshot.current.trim() === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = await actions.archiveCurrent(snapshot.current, snapshot.current);
      applySnapshot(next);
      setMode("current");
    } catch (archiveError: unknown) {
      setError(errorMessage(archiveError));
    } finally {
      setBusy(false);
    }
  };

  let meta = "Current";
  if (mode === "edit") meta = "Editing";
  else if (mode === "history") meta = "History";

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="trail-home-weekly-notes__status" role="status">
        Loading notes...
      </div>
    );
  } else if (snapshot === null) {
    content = (
      <div className="trail-home-weekly-notes__load-error">
        <span>{error ?? "Weekly meeting notes are unavailable."}</span>
        <TrailButton onClick={() => setLoadRevision((value) => value + 1)}>
          Retry
        </TrailButton>
      </div>
    );
  } else if (mode === "edit") {
    content = (
      <div className="trail-home-weekly-notes" data-mode="edit">
        <div className="trail-home-weekly-notes__main">
          <TrailTextarea
            aria-label="Current weekly meeting notes"
            disabled={busy}
            onChange={(event) => setDraft(event.currentTarget.value)}
            value={draft}
          />
        </div>
        {error === null ? null : (
          <div className="trail-home-weekly-notes__feedback" role="alert">{error}</div>
        )}
        <div className="trail-home-weekly-notes__footer">
          <TrailButton
            disabled={busy}
            onClick={() => {
              setDraft(snapshot.current);
              setError(null);
              setMode("current");
            }}
          >
            Cancel
          </TrailButton>
          <TrailButton
            disabled={busy || draft === snapshot.current}
            onClick={() => void saveCurrent()}
            variant="primary"
          >
            Save
          </TrailButton>
        </div>
      </div>
    );
  } else if (mode === "history") {
    const selectedArchive = selectedArchiveIndex === null
      ? null
      : snapshot.archives[selectedArchiveIndex] ?? null;
    const archiveIndices = snapshot.archives.map((_, index) => index).reverse();

    content = (
      <div className="trail-home-weekly-notes" data-mode="history">
        <div className="trail-home-weekly-notes__history">
          <div aria-label="Weekly note archive dates" className="trail-home-weekly-notes__history-list">
            {archiveIndices.map((index) => {
              const archive = snapshot.archives[index];
              return (
                <button
                  aria-pressed={index === selectedArchiveIndex}
                  className="trail-home-weekly-notes__history-date"
                  data-selected={index === selectedArchiveIndex ? "true" : "false"}
                  key={`${archive.date}-${index}`}
                  onClick={() => setSelectedArchiveIndex(index)}
                  type="button"
                >
                  {archive.date}
                </button>
              );
            })}
          </div>
          <div className="trail-home-weekly-notes__history-content">
            {selectedArchive === null ? (
              <div className="trail-home-weekly-notes__empty">No archived notes yet.</div>
            ) : (
              <TrailMarkdownContent
                className="trail-home-weekly-notes__markdown"
                markdown={selectedArchive.content}
                renderMarkdown={renderMarkdown}
              />
            )}
          </div>
        </div>
        <div className="trail-home-weekly-notes__footer">
          <TrailButton
            onClick={() => {
              setError(null);
              setMode("current");
            }}
          >
            Current
          </TrailButton>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="trail-home-weekly-notes" data-mode="current">
        <div className="trail-home-weekly-notes__main">
          <TrailWeeklyNotesMarkdown
            markdown={snapshot.current}
            renderMarkdown={renderMarkdown}
          />
        </div>
        {error === null ? null : (
          <div className="trail-home-weekly-notes__feedback" role="alert">{error}</div>
        )}
        <div className="trail-home-weekly-notes__footer">
          <TrailButton
            disabled={snapshot.archives.length === 0 || busy}
            onClick={() => {
              setError(null);
              setMode("history");
            }}
          >
            History
          </TrailButton>
          <div className="trail-home-weekly-notes__actions">
            <TrailButton
              disabled={busy}
              onClick={() => {
                setDraft(snapshot.current);
                setError(null);
                setMode("edit");
              }}
            >
              Edit
            </TrailButton>
            <TrailButton
              disabled={busy || snapshot.current.trim() === ""}
              onClick={() => void archiveCurrent()}
            >
              Archive / next
            </TrailButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TrailHomeWidgetFrame meta={meta} size="wide" title="Weekly meeting notes">
      {content}
    </TrailHomeWidgetFrame>
  );
}
