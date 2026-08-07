import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";

import type { TrailTask } from "./domain/trail-model";

export interface TrailTaskTitleEditorHandle {
  requestClose(): void;
}

export interface TrailTaskTitleEditorProps {
  task: TrailTask;
  onSave: (task: TrailTask, title: string) => Promise<void>;
  onClose: () => void;
}

export const TrailTaskTitleEditor = forwardRef<
  TrailTaskTitleEditorHandle,
  TrailTaskTitleEditorProps
>(function TrailTaskTitleEditor(
  { task, onSave, onClose },
  ref,
) {
  const [draft, setDraft] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [showDiscardConfirmation, setShowDiscardConfirmation] =
    useState(false);
  const normalizedDraft = useMemo(() => draft.trim(), [draft]);
  const isDirty = draft !== task.title;
  const canSave =
    !isSaving
    && normalizedDraft !== ""
    && normalizedDraft !== task.title;

  const requestClose = (): void => {
    if (isSaving) {
      return;
    }

    if (isDirty) {
      setShowDiscardConfirmation(true);
      return;
    }

    onClose();
  };

  useImperativeHandle(ref, () => ({ requestClose }));

  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setSaveError(undefined);
    setShowDiscardConfirmation(false);

    try {
      await onSave(task, normalizedDraft);
      onClose();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unknown Task update error.",
      );
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void save(event)}>
      <label>
        <span>Title</span>
        <input
          aria-label="Task title"
          autoFocus
          type="text"
          value={draft}
          disabled={isSaving}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setSaveError(undefined);
            setShowDiscardConfirmation(false);
          }}
        />
      </label>

      {saveError !== undefined && (
        <p role="alert">Task update failed: {saveError}</p>
      )}

      {showDiscardConfirmation && (
        <div role="alertdialog" aria-label="Unsaved Task title">
          <p>Discard unsaved Task title changes?</p>
          <button
            type="button"
            onClick={onClose}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => setShowDiscardConfirmation(false)}
          >
            Keep editing
          </button>
        </div>
      )}

      <div>
        <button
          type="button"
          disabled={isSaving}
          onClick={requestClose}
        >
          Cancel
        </button>
        <button type="submit" disabled={!canSave}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
});
