import type {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
} from "react";
import { useRef, useState } from "react";
import { useStore } from "zustand";

import { selectTrailIssueFullItemReadModel } from "../../../query/issues/trail-issue-full-item-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailMarkdownContent, type TrailMarkdownRender } from "../../patterns/trail-markdown-content";
import { TrailPageBreadcrumbButton } from "../../patterns/trail-page-header";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailIssueBodyEditor } from "./trail-issue-body-editor";

type TrailIssueFullItemActions = Pick<TrailUiActions["issues"], "editProperties">;

type TrailIssuePlanningPatch =
  | { readonly description: string }
  | { readonly title: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailIssueFullItemPage({
  actions,
  issueId,
  onProjectActivate,
  onProjectsActivate,
  renderMarkdown,
  runtimeStore,
}: {
  readonly actions: TrailIssueFullItemActions;
  readonly issueId: string;
  readonly onProjectActivate: (projectId: string) => void;
  readonly onProjectsActivate: () => void;
  readonly renderMarkdown: TrailMarkdownRender;
  readonly runtimeStore: TrailRuntimeStore;
}) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const readModel = selectTrailIssueFullItemReadModel(state, issueId);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [bodyEditSeed, setBodyEditSeed] = useState<string | null>(null);
  const [bodyRecoveryDraft, setBodyRecoveryDraft] = useState<string | null>(null);
  const [titleSaving, setTitleSaving] = useState(false);
  const [bodySaving, setBodySaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const cancelTitleBlurRef = useRef(false);

  if (readModel === null) {
    return <section aria-label="Issue" className="trail-issue-full-item" />;
  }

  const editable = readModel.capabilities.canEditPlanningFields;
  const displayedBody = bodyRecoveryDraft ?? readModel.issue.description ?? "";

  const submitPlanningPatch = (patch: TrailIssuePlanningPatch): Promise<void> => {
    const latest = selectTrailIssueFullItemReadModel(runtimeStore.getState(), issueId);
    if (latest === null) {
      throw new Error("This issue is no longer available.");
    }
    if (!latest.capabilities.canEditPlanningFields) {
      throw new Error("The owning project no longer allows issue planning edits.");
    }

    const expectedIssue = latest.expectedIssue;
    const result = actions.editProperties(expectedIssue, {
      description: "description" in patch ? patch.description : expectedIssue.description,
      due: expectedIssue.due,
      estimate: expectedIssue.estimate,
      labelIds: expectedIssue.labelIds,
      priority: expectedIssue.priority,
      title: "title" in patch ? patch.title : expectedIssue.title,
    });

    switch (result.kind) {
      case "submitted":
        return result.receipt.completion;
      case "unchanged":
        return Promise.resolve();
      case "needs-input":
        throw new Error(result.input.message);
    }
  };

  const commitTitle = (draft: string) => {
    if (!editable || titleSaving) return;
    if (draft.trim() === "") {
      setFeedback("Title is required.");
      return;
    }

    setTitleDraft(null);
    setFeedback(null);
    setTitleSaving(true);
    let completion: Promise<void>;
    try {
      completion = submitPlanningPatch({ title: draft });
    } catch (error) {
      setTitleSaving(false);
      setTitleDraft(draft);
      setFeedback(errorMessage(error));
      return;
    }

    void completion.then(() => {
      setTitleSaving(false);
    }).catch((error: unknown) => {
      setTitleSaving(false);
      setTitleDraft(draft);
      setFeedback(errorMessage(error));
    });
  };

  const handleTitleBlur: FocusEventHandler<HTMLTextAreaElement> = () => {
    if (cancelTitleBlurRef.current) {
      cancelTitleBlurRef.current = false;
      return;
    }
    if (titleDraft !== null) commitTitle(titleDraft);
  };

  const handleTitleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelTitleBlurRef.current = true;
      setTitleDraft(null);
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const startBodyEdit = () => {
    if (!editable || bodySaving || bodyEditSeed !== null) return;
    setFeedback(null);
    setBodyEditSeed(displayedBody);
    setBodyRecoveryDraft(null);
  };

  const handleBodyReadClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target instanceof Element && event.target.closest("a") !== null) return;
    startBodyEdit();
  };

  const handleBodyReadKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (
      event.key !== "Enter"
      || event.defaultPrevented
      || (event.target instanceof Element && event.target.closest("a") !== null)
    ) return;
    event.preventDefault();
    startBodyEdit();
  };

  const commitBody = (draft: string) => {
    setBodyEditSeed(null);
    if (!editable || bodySaving) return;

    setFeedback(null);
    setBodySaving(true);
    let completion: Promise<void>;
    try {
      completion = submitPlanningPatch({ description: draft });
    } catch (error) {
      setBodySaving(false);
      setBodyRecoveryDraft(draft);
      setFeedback(errorMessage(error));
      return;
    }

    void completion.then(() => {
      setBodySaving(false);
      setBodyRecoveryDraft(null);
    }).catch((error: unknown) => {
      setBodySaving(false);
      setBodyRecoveryDraft(draft);
      setFeedback(errorMessage(error));
    });
  };

  return (
    <section
      aria-label={`Issue: ${readModel.issue.title}`}
      className="trail-issue-full-item"
      data-editable={editable ? "true" : undefined}
    >
      <div className="trail-issue-full-item__scroll">
        <div className="trail-issue-full-item__document">
          <nav aria-label="Issue ancestry" className="trail-issue-full-item__breadcrumb">
            <TrailPageBreadcrumbButton onClick={onProjectsActivate}>
              Projects
            </TrailPageBreadcrumbButton>
            <span aria-hidden="true" className="trail-issue-full-item__breadcrumb-separator">/</span>
            <TrailPageBreadcrumbButton
              onClick={() => onProjectActivate(readModel.issue.project.id)}
            >
              {readModel.issue.project.title}
            </TrailPageBreadcrumbButton>
          </nav>

          <div className="trail-issue-full-item__title-region">
            {editable ? (
              <textarea
                aria-label="Issue title"
                className="trail-issue-full-item__title-input"
                onBlur={handleTitleBlur}
                onChange={(event) => {
                  setTitleDraft(event.currentTarget.value.replace(/[\r\n]+/g, " "));
                }}
                onFocus={() => {
                  if (!titleSaving && titleDraft === null) {
                    setTitleDraft(readModel.issue.title);
                  }
                }}
                onKeyDown={handleTitleKeyDown}
                readOnly={titleSaving}
                rows={1}
                value={titleDraft ?? readModel.issue.title}
              />
            ) : (
              <h1 className="trail-issue-full-item__title">{readModel.issue.title}</h1>
            )}
          </div>

          <div className="trail-issue-full-item__body-region">
            {bodyEditSeed === null ? (
              <div
                aria-label={editable ? "Edit issue description" : undefined}
                className="trail-issue-full-item__body-read"
                data-editable={editable && !bodySaving ? "true" : undefined}
                data-unsaved={bodyRecoveryDraft !== null ? "true" : undefined}
                onClick={editable && !bodySaving ? handleBodyReadClick : undefined}
                onKeyDown={editable && !bodySaving ? handleBodyReadKeyDown : undefined}
                tabIndex={editable && !bodySaving ? 0 : undefined}
              >
                {displayedBody.trim() === "" ? (
                  editable ? (
                    <span className="trail-issue-full-item__body-placeholder">
                      Add description...
                    </span>
                  ) : null
                ) : (
                  <TrailMarkdownContent
                    className="trail-issue-full-item__markdown markdown-rendered"
                    markdown={displayedBody}
                    renderMarkdown={renderMarkdown}
                  />
                )}
              </div>
            ) : (
              <TrailIssueBodyEditor
                initialValue={bodyEditSeed}
                onCancel={() => {
                  setBodyEditSeed(null);
                  setFeedback(null);
                }}
                onCommit={commitBody}
              />
            )}
          </div>

          {titleSaving || bodySaving || feedback !== null ? (
            <div
              aria-live="polite"
              className="trail-issue-full-item__feedback"
              data-error={feedback !== null ? "true" : undefined}
              role={feedback === null ? undefined : "alert"}
            >
              {feedback ?? "Saving..."}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
