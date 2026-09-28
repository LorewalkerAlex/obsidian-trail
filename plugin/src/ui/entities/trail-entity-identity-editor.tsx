import {
  useEffect,
  useRef,
  useState,
} from "react";

import { TrailComposer } from "../patterns/trail-composer";
import {
  TrailStandardComposerEditor,
  TrailStandardComposerForm,
} from "../patterns/trail-standard-composer-form";
import { TrailInput } from "../primitives/trail-input";
import { TrailTextarea } from "../primitives/trail-textarea";

export interface TrailEntityIdentityDraft {
  readonly description?: string;
  readonly title: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailEntityIdentityEditor({
  context,
  description,
  onOpenChange,
  onSave,
  open,
  title,
}: {
  readonly context: "Initiative" | "Project";
  readonly description?: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (draft: TrailEntityIdentityDraft) => Promise<void>;
  readonly open: boolean;
  readonly title: string;
}) {
  const baselineDescription = description ?? "";
  const [titleDraft, setTitleDraft] = useState(title);
  const [descriptionDraft, setDescriptionDraft] = useState(baselineDescription);
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const previousOpenRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      setTitleDraft(title);
      setDescriptionDraft(baselineDescription);
      setFeedback(undefined);
      pendingRef.current = false;
      setPending(false);
    }
    previousOpenRef.current = open;
  }, [baselineDescription, open, title]);

  const normalizedTitle = titleDraft.trim();
  const dirty = titleDraft !== title || descriptionDraft !== baselineDescription;
  const submit = async () => {
    if (pendingRef.current || normalizedTitle.length === 0 || !dirty) return;
    pendingRef.current = true;
    setPending(true);
    setFeedback(undefined);
    try {
      await onSave({
        description: descriptionDraft.trim() === "" ? undefined : descriptionDraft,
        title: normalizedTitle,
      });
      pendingRef.current = false;
      setPending(false);
      onOpenChange(false);
    } catch (error: unknown) {
      pendingRef.current = false;
      setPending(false);
      setFeedback(`Save failed: ${errorMessage(error)}`);
    }
  };

  return (
    <TrailComposer
      canSubmit={normalizedTitle.length > 0 && dirty}
      context={`Edit ${context.toLocaleLowerCase()}`}
      dirty={dirty}
      feedback={feedback}
      initialFocusRef={titleRef}
      onDismiss={() => {
        if (!pendingRef.current) onOpenChange(false);
      }}
      onSubmit={() => { void submit(); }}
      open={open}
      pending={pending}
      pendingLabel="Saving..."
      submitLabel="Save"
    >
      <TrailStandardComposerForm>
        <TrailStandardComposerEditor>
          <TrailInput
            aria-label={`${context} title`}
            disabled={pending}
            onChange={(event) => {
              setTitleDraft(event.currentTarget.value);
              setFeedback(undefined);
            }}
            placeholder="Title"
            ref={titleRef}
            value={titleDraft}
          />
          <TrailTextarea
            aria-label={`${context} description`}
            disabled={pending}
            onChange={(event) => {
              setDescriptionDraft(event.currentTarget.value);
              setFeedback(undefined);
            }}
            placeholder="Add description..."
            rows={5}
            value={descriptionDraft}
          />
        </TrailStandardComposerEditor>
      </TrailStandardComposerForm>
    </TrailComposer>
  );
}
