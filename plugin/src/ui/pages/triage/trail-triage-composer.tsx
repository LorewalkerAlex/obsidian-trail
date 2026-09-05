import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { TrailConfiguration } from "../../../domain/model/trail-configuration";
import type { TrailTriageIssue } from "../../../domain/model/trail-entities";
import type { TrailTimestamp } from "../../../domain/model/trail-values";
import { TrailDuePropertySelect } from "../../entities/trail-due-property-select";
import { TrailLabelPropertySelect } from "../../entities/trail-label-property-select";
import { TrailPriorityPropertySelect } from "../../entities/trail-priority-property-select";
import { TrailComposer } from "../../patterns/trail-composer";
import { TrailInput } from "../../primitives/trail-input";
import { TrailTextarea } from "../../primitives/trail-textarea";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailTriageComposerActions = Pick<TrailUiActions["triage"], "create">;

interface TrailTriageComposerDraft {
  readonly description: string;
  readonly due: TrailTimestamp;
  readonly labelIds: readonly string[];
  readonly priority: TrailTriageIssue["priority"];
  readonly title: string;
}

function createDraft(defaultDue: TrailTimestamp): TrailTriageComposerDraft {
  return {
    description: "",
    due: defaultDue,
    labelIds: [],
    priority: undefined,
    title: "",
  };
}

function sameDraft(
  left: TrailTriageComposerDraft,
  right: TrailTriageComposerDraft,
): boolean {
  return left.description === right.description
    && left.due === right.due
    && left.priority === right.priority
    && left.title === right.title
    && left.labelIds.length === right.labelIds.length
    && left.labelIds.every((labelId, index) => labelId === right.labelIds[index]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function TrailTriageComposer({
  actions,
  configuration,
  defaultDue,
  onOpenChange,
  open,
}: {
  readonly actions: TrailTriageComposerActions;
  readonly configuration: TrailConfiguration;
  readonly defaultDue: TrailTimestamp;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  const initialDraft = createDraft(defaultDue);
  const [baseline, setBaseline] = useState<TrailTriageComposerDraft>(initialDraft);
  const [draft, setDraft] = useState<TrailTriageComposerDraft>(initialDraft);
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const previousOpenRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      const nextDraft = createDraft(defaultDue);
      setBaseline(nextDraft);
      setDraft(nextDraft);
      setFeedback(undefined);
      pendingRef.current = false;
      setPending(false);
    }
    previousOpenRef.current = open;
  }, [defaultDue, open]);

  const updateDraft = (patch: Partial<TrailTriageComposerDraft>) => {
    if (pendingRef.current) return;
    setDraft((current) => ({ ...current, ...patch }));
    setFeedback(undefined);
  };

  const closeComposer = () => {
    if (pendingRef.current) return;
    onOpenChange(false);
  };

  const submit = async () => {
    if (pendingRef.current || draft.title.trim().length === 0) return;
    pendingRef.current = true;
    setPending(true);
    setFeedback(undefined);
    try {
      const receipt = actions.create({
        description: draft.description,
        due: draft.due,
        labelIds: draft.labelIds,
        priority: draft.priority,
        title: draft.title,
      });
      await receipt.completion;
      onOpenChange(false);
    } catch (error: unknown) {
      pendingRef.current = false;
      setFeedback(`Create failed: ${errorMessage(error)}`);
      setPending(false);
    }
  };

  return (
    <TrailComposer
      canSubmit={draft.title.trim().length > 0}
      context="Triage"
      dirty={!sameDraft(draft, baseline)}
      feedback={feedback}
      initialFocusRef={titleRef}
      onDismiss={closeComposer}
      onSubmit={() => {
        void submit();
      }}
      open={open}
      pending={pending}
      submitLabel="Create"
    >
      <div className="trail-composer__fields">
        <TrailInput
          aria-label="Triage title"
          disabled={pending}
          onChange={(event) => updateDraft({ title: event.currentTarget.value })}
          placeholder="Title"
          ref={titleRef}
          value={draft.title}
        />
        <TrailTextarea
          aria-label="Triage description"
          disabled={pending}
          onChange={(event) => updateDraft({ description: event.currentTarget.value })}
          placeholder="Add description..."
          rows={6}
          value={draft.description}
        />
        <div aria-label="Triage properties" className="trail-composer__properties" role="group">
          <TrailPriorityPropertySelect
            disabled={pending}
            onValueChange={(priority) => updateDraft({ priority })}
            value={draft.priority}
          />
          <TrailLabelPropertySelect
            disabled={pending}
            groups={configuration.labelGroups}
            labels={configuration.labels}
            onValueChange={(labelIds) => updateDraft({ labelIds })}
            value={draft.labelIds}
          />
          <TrailDuePropertySelect
            disabled={pending}
            onValueChange={(due) => updateDraft({ due })}
            timezone={configuration.temporal.timezone}
            value={draft.due}
          />
        </div>
      </div>
    </TrailComposer>
  );
}
