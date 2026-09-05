import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import type { TrailWorkflowIssueCreateInput } from "../../application/issues/trail-issue-application";
import type { TrailProjectCreateInput } from "../../application/projects/trail-project-application";
import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import {
  TRAIL_ESTIMATES,
  type TrailEstimate,
  type TrailPriority,
  type TrailTimestamp,
} from "../../domain/model/trail-values";
import {
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
  type TrailCalendarDate,
} from "../../domain/rules/trail-temporal-rules";
import { TrailComposer } from "../patterns/trail-composer";
import { TrailPropertyControl } from "../patterns/trail-property-control";
import { TrailViewPopover } from "../patterns/trail-view-popover";
import { TrailInput } from "../primitives/trail-input";
import { TrailTextarea } from "../primitives/trail-textarea";
import { TrailDueDate } from "./trail-due";
import { TrailLabelPropertySelect } from "./trail-label-property-select";
import { TrailPriorityPropertySelect } from "./trail-priority-property-select";

export interface TrailNamedCreationTarget {
  readonly id: string;
  readonly title: string;
}

export interface TrailIssueCreationProjectTarget extends TrailNamedCreationTarget {
  readonly milestones: readonly TrailNamedCreationTarget[];
}

interface TrailRelationPropertySelectProps {
  readonly disabled?: boolean;
  readonly label: string;
  readonly noneLabel?: string;
  readonly onValueChange: (value: string | undefined) => void;
  readonly options: readonly TrailNamedCreationTarget[];
  readonly placeholder: string;
  readonly required?: boolean;
  readonly triggerRef?: RefObject<HTMLButtonElement | null>;
  readonly value: string | undefined;
}

function TrailRelationPropertySelect({
  disabled = false,
  label,
  noneLabel = `No ${label.toLocaleLowerCase()}`,
  onValueChange,
  options,
  placeholder,
  required = false,
  triggerRef,
  value,
}: TrailRelationPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const summary = selected?.title ?? placeholder;

  const choose = (nextValue: string | undefined) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label={label}
      layer="modal-child"
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`${label}: ${summary}`}
          aria-haspopup="dialog"
          disabled={disabled}
          ref={triggerRef}
        >
          <span className="trail-property-control__summary">{summary}</span>
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">{label}</div>
        {!required ? (
          <button
            className="trail-view-popover__item"
            onClick={() => choose(undefined)}
            type="button"
          >
            <span>{noneLabel}</span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible={value === undefined ? "true" : "false"}
            >
              ✓
            </span>
          </button>
        ) : null}
        {options.map((option) => (
          <button
            className="trail-view-popover__item"
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <span>{option.title}</span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible={option.id === value ? "true" : "false"}
            >
              ✓
            </span>
          </button>
        ))}
        {options.length === 0 ? (
          <div className="trail-view-popover__title">No available options</div>
        ) : null}
      </div>
    </TrailViewPopover>
  );
}

const ESTIMATE_LABELS: Readonly<Record<TrailEstimate, string>> = {
  large: "L",
  medium: "M",
  small: "S",
  xlarge: "XL",
};

function TrailEstimatePropertySelect({
  disabled = false,
  onValueChange,
  value,
}: {
  readonly disabled?: boolean;
  readonly onValueChange: (value: TrailEstimate | undefined) => void;
  readonly value: TrailEstimate | undefined;
}) {
  const [open, setOpen] = useState(false);
  const summary = value === undefined ? "No estimate" : ESTIMATE_LABELS[value];
  const choose = (nextValue: TrailEstimate | undefined) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <TrailViewPopover
      label="Estimate"
      layer="modal-child"
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Estimate: ${summary}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          {summary}
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Estimate</div>
        <button
          className="trail-view-popover__item"
          onClick={() => choose(undefined)}
          type="button"
        >
          <span>No estimate</span>
          <span
            aria-hidden="true"
            className="trail-view-popover__check"
            data-visible={value === undefined ? "true" : "false"}
          >
            ✓
          </span>
        </button>
        {TRAIL_ESTIMATES.map((estimate) => (
          <button
            className="trail-view-popover__item"
            key={estimate}
            onClick={() => choose(estimate)}
            type="button"
          >
            <span>{ESTIMATE_LABELS[estimate]}</span>
            <span
              aria-hidden="true"
              className="trail-view-popover__check"
              data-visible={estimate === value ? "true" : "false"}
            >
              ✓
            </span>
          </button>
        ))}
      </div>
    </TrailViewPopover>
  );
}

function calendarDateToInputValue(timestamp: TrailTimestamp, timezone: string): string {
  const date = readTrailZonedDateTimeParts(timestamp, timezone);
  return [
    String(date.year).padStart(4, "0"),
    String(date.month).padStart(2, "0"),
    String(date.day).padStart(2, "0"),
  ].join("-");
}

function parseCalendarDate(value: string): TrailCalendarDate | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return undefined;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) return undefined;
  return { day, month, year };
}

function replaceCalendarDate(
  referenceTimestamp: TrailTimestamp,
  timezone: string,
  date: TrailCalendarDate,
): TrailTimestamp {
  const reference = readTrailZonedDateTimeParts(referenceTimestamp, timezone);
  return resolveTrailZonedDateTimeParts({
    ...reference,
    day: date.day,
    month: date.month,
    year: date.year,
  }, timezone);
}

function TrailCalendarIcon() {
  return (
    <svg aria-hidden="true" className="trail-due-select__icon" viewBox="0 0 16 16">
      <path d="M3.25 4.5h9.5v8h-9.5zM5 2.75v3M11 2.75v3M3.25 7h9.5" />
    </svg>
  );
}

function TrailOptionalDuePropertySelect({
  disabled = false,
  onValueChange,
  referenceTimestamp,
  timezone,
  value,
}: {
  readonly disabled?: boolean;
  readonly onValueChange: (value: TrailTimestamp | undefined) => void;
  readonly referenceTimestamp: TrailTimestamp;
  readonly timezone: string;
  readonly value: TrailTimestamp | undefined;
}) {
  const [open, setOpen] = useState(false);

  return (
    <TrailViewPopover
      label="Due"
      layer="modal-child"
      onOpenChange={setOpen}
      open={open}
      trigger={(
        <TrailPropertyControl
          aria-label={`Due: ${value === undefined ? "No due" : "Set"}`}
          aria-haspopup="dialog"
          disabled={disabled}
        >
          <TrailCalendarIcon />
          {value === undefined
            ? "No due"
            : <TrailDueDate timestamp={value} timezone={timezone} />}
        </TrailPropertyControl>
      )}
    >
      <div className="trail-view-popover__stack">
        <div className="trail-view-popover__title">Due</div>
        {value === undefined ? null : (
          <button
            className="trail-view-popover__item"
            onClick={() => {
              onValueChange(undefined);
              setOpen(false);
            }}
            type="button"
          >
            <span>No due</span>
          </button>
        )}
        <label className="trail-view-popover__date-field">
          <span>Date</span>
          <input
            aria-label="Due date"
            onChange={(event) => {
              const date = parseCalendarDate(event.currentTarget.value);
              if (date === undefined) return;
              onValueChange(replaceCalendarDate(
                value ?? referenceTimestamp,
                timezone,
                date,
              ));
              setOpen(false);
            }}
            type="date"
            value={value === undefined ? "" : calendarDateToInputValue(value, timezone)}
          />
        </label>
      </div>
    </TrailViewPopover>
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type IssueComposerDraft = Omit<TrailWorkflowIssueCreateInput, "projectId"> & {
  readonly projectId?: string;
};

function sameIssueDraft(left: IssueComposerDraft, right: IssueComposerDraft): boolean {
  return left.description === right.description
    && left.due === right.due
    && left.estimate === right.estimate
    && left.milestoneId === right.milestoneId
    && left.priority === right.priority
    && left.projectId === right.projectId
    && left.title === right.title
    && sameStrings(left.labelIds, right.labelIds);
}

export function TrailWorkflowIssueComposer({
  configuration,
  initialProjectId,
  onCreate,
  onOpenChange,
  open,
  projects,
  referenceTimestamp,
  seedDescription = "",
  seedTitle,
}: {
  readonly configuration: TrailConfiguration;
  readonly initialProjectId?: string;
  readonly onCreate: (input: TrailWorkflowIssueCreateInput) => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly projects: readonly TrailIssueCreationProjectTarget[];
  readonly referenceTimestamp: TrailTimestamp;
  readonly seedDescription?: string;
  readonly seedTitle: string;
}) {
  const initialDraft = useMemo<IssueComposerDraft>(() => ({
    description: seedDescription,
    due: undefined,
    estimate: undefined,
    labelIds: [],
    milestoneId: undefined,
    priority: undefined,
    projectId: initialProjectId,
    title: seedTitle,
  }), [initialProjectId, seedDescription, seedTitle]);
  const [baseline, setBaseline] = useState<IssueComposerDraft>(initialDraft);
  const [draft, setDraft] = useState<IssueComposerDraft>(initialDraft);
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const previousOpenRef = useRef(false);
  const projectRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const selectedProject = projects.find(({ id }) => id === draft.projectId);
  const effectiveMilestoneId = selectedProject?.milestones.some(({ id }) => id === draft.milestoneId)
    ? draft.milestoneId
    : undefined;
  const canSubmit = selectedProject !== undefined && draft.title.trim().length > 0;

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      setBaseline(initialDraft);
      setDraft(initialDraft);
      setFeedback(undefined);
      pendingRef.current = false;
      setPending(false);
    }
    previousOpenRef.current = open;
  }, [initialDraft, open]);

  const updateDraft = (patch: Partial<IssueComposerDraft>) => {
    if (pendingRef.current) return;
    setDraft((current) => ({ ...current, ...patch }));
    setFeedback(undefined);
  };

  const submit = async () => {
    if (pendingRef.current || !canSubmit || selectedProject === undefined) return;
    pendingRef.current = true;
    setPending(true);
    setFeedback(undefined);
    try {
      await onCreate({
        description: draft.description,
        due: draft.due,
        estimate: draft.estimate,
        labelIds: draft.labelIds,
        milestoneId: effectiveMilestoneId,
        priority: draft.priority,
        projectId: selectedProject.id,
        title: draft.title,
      });
      pendingRef.current = false;
      setPending(false);
      onOpenChange(false);
    } catch (error: unknown) {
      pendingRef.current = false;
      setPending(false);
      setFeedback(`Create failed: ${errorMessage(error)}`);
    }
  };

  return (
    <TrailComposer
      canSubmit={canSubmit}
      context={`Issue · ${selectedProject?.title ?? "Choose project"}`}
      dirty={!sameIssueDraft(draft, baseline)}
      feedback={feedback}
      initialFocusRef={selectedProject === undefined ? projectRef : titleRef}
      onDismiss={() => {
        if (!pendingRef.current) onOpenChange(false);
      }}
      onSubmit={() => { void submit(); }}
      open={open}
      pending={pending}
      submitLabel="Create"
    >
      <div className="trail-composer__fields">
        <TrailInput
          aria-label="Issue title"
          disabled={pending}
          onChange={(event) => updateDraft({ title: event.currentTarget.value })}
          placeholder="Title"
          ref={titleRef}
          value={draft.title}
        />
        <TrailTextarea
          aria-label="Issue description"
          disabled={pending}
          onChange={(event) => updateDraft({ description: event.currentTarget.value })}
          placeholder="Add description..."
          rows={6}
          value={draft.description}
        />
        <div aria-label="Issue properties" className="trail-composer__properties" role="group">
          <TrailRelationPropertySelect
            disabled={pending}
            label="Project"
            onValueChange={(projectId) => {
              const milestones = projects.find(({ id }) => id === projectId)?.milestones ?? [];
              updateDraft({
                milestoneId: milestones.some(({ id }) => id === draft.milestoneId)
                  ? draft.milestoneId
                  : undefined,
                projectId,
              });
            }}
            options={projects}
            placeholder="Choose project"
            required
            triggerRef={projectRef}
            value={draft.projectId}
          />
          <TrailPriorityPropertySelect
            disabled={pending}
            layer="modal-child"
            onValueChange={(priority) => updateDraft({ priority })}
            value={draft.priority}
          />
          <TrailLabelPropertySelect
            disabled={pending}
            entityType="issue"
            groups={configuration.labelGroups}
            labels={configuration.labels}
            layer="modal-child"
            onValueChange={(labelIds) => updateDraft({ labelIds })}
            value={draft.labelIds}
          />
          <TrailRelationPropertySelect
            disabled={pending || draft.projectId === undefined}
            label="Milestone"
            onValueChange={(milestoneId) => updateDraft({ milestoneId })}
            options={selectedProject?.milestones ?? []}
            placeholder="No milestone"
            value={effectiveMilestoneId}
          />
          <TrailEstimatePropertySelect
            disabled={pending}
            onValueChange={(estimate) => updateDraft({ estimate })}
            value={draft.estimate}
          />
          <TrailOptionalDuePropertySelect
            disabled={pending}
            onValueChange={(due) => updateDraft({ due })}
            referenceTimestamp={referenceTimestamp}
            timezone={configuration.temporal.timezone}
            value={draft.due}
          />
        </div>
      </div>
    </TrailComposer>
  );
}

function sameProjectDraft(left: TrailProjectCreateInput, right: TrailProjectCreateInput): boolean {
  return left.description === right.description
    && left.due === right.due
    && left.initiativeId === right.initiativeId
    && left.priority === right.priority
    && left.title === right.title
    && sameStrings(left.labelIds, right.labelIds);
}

export function TrailProjectComposer({
  configuration,
  initiatives,
  onCreate,
  onOpenChange,
  open,
  referenceTimestamp,
  seedDescription = "",
  seedTitle,
}: {
  readonly configuration: TrailConfiguration;
  readonly initiatives: readonly TrailNamedCreationTarget[];
  readonly onCreate: (input: TrailProjectCreateInput) => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly referenceTimestamp: TrailTimestamp;
  readonly seedDescription?: string;
  readonly seedTitle: string;
}) {
  const initialDraft = useMemo<TrailProjectCreateInput>(() => ({
    description: seedDescription,
    due: undefined,
    initiativeId: undefined,
    labelIds: [],
    priority: undefined,
    title: seedTitle,
  }), [seedDescription, seedTitle]);
  const [baseline, setBaseline] = useState<TrailProjectCreateInput>(initialDraft);
  const [draft, setDraft] = useState<TrailProjectCreateInput>(initialDraft);
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const previousOpenRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const canSubmit = draft.title.trim().length > 0;

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      setBaseline(initialDraft);
      setDraft(initialDraft);
      setFeedback(undefined);
      pendingRef.current = false;
      setPending(false);
    }
    previousOpenRef.current = open;
  }, [initialDraft, open]);

  const updateDraft = (patch: Partial<TrailProjectCreateInput>) => {
    if (pendingRef.current) return;
    setDraft((current) => ({ ...current, ...patch }));
    setFeedback(undefined);
  };

  const submit = async () => {
    if (pendingRef.current || !canSubmit) return;
    pendingRef.current = true;
    setPending(true);
    setFeedback(undefined);
    try {
      await onCreate(draft);
      pendingRef.current = false;
      setPending(false);
      onOpenChange(false);
    } catch (error: unknown) {
      pendingRef.current = false;
      setPending(false);
      setFeedback(`Create failed: ${errorMessage(error)}`);
    }
  };

  return (
    <TrailComposer
      canSubmit={canSubmit}
      context="Project"
      dirty={!sameProjectDraft(draft, baseline)}
      feedback={feedback}
      initialFocusRef={titleRef}
      onDismiss={() => {
        if (!pendingRef.current) onOpenChange(false);
      }}
      onSubmit={() => { void submit(); }}
      open={open}
      pending={pending}
      submitLabel="Create"
    >
      <div className="trail-composer__fields">
        <TrailInput
          aria-label="Project title"
          disabled={pending}
          onChange={(event) => updateDraft({ title: event.currentTarget.value })}
          placeholder="Title"
          ref={titleRef}
          value={draft.title}
        />
        <TrailTextarea
          aria-label="Project description"
          disabled={pending}
          onChange={(event) => updateDraft({ description: event.currentTarget.value })}
          placeholder="Add description..."
          rows={6}
          value={draft.description}
        />
        <div aria-label="Project properties" className="trail-composer__properties" role="group">
          <TrailRelationPropertySelect
            disabled={pending}
            label="Initiative"
            onValueChange={(initiativeId) => updateDraft({ initiativeId })}
            options={initiatives}
            placeholder="No initiative"
            value={draft.initiativeId}
          />
          <TrailPriorityPropertySelect
            disabled={pending}
            layer="modal-child"
            onValueChange={(priority: TrailPriority | undefined) => updateDraft({ priority })}
            value={draft.priority}
          />
          <TrailLabelPropertySelect
            disabled={pending}
            entityType="project"
            groups={configuration.labelGroups}
            labels={configuration.labels}
            layer="modal-child"
            onValueChange={(labelIds) => updateDraft({ labelIds })}
            value={draft.labelIds}
          />
          <TrailOptionalDuePropertySelect
            disabled={pending}
            onValueChange={(due) => updateDraft({ due })}
            referenceTimestamp={referenceTimestamp}
            timezone={configuration.temporal.timezone}
            value={draft.due}
          />
        </div>
      </div>
    </TrailComposer>
  );
}
