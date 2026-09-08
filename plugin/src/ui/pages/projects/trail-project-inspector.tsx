import { useState } from "react";
import { useStore } from "zustand";

import type { TrailProject } from "../../../domain/model/trail-entities";
import {
  selectTrailProjectInspectorReadModel,
  type TrailProjectInspectorReadModel,
} from "../../../query/projects/trail-project-inspector-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailLabelPropertySelect } from "../../entities/trail-label-property-select";
import { TrailOptionalDuePropertySelect } from "../../entities/trail-optional-due-property-select";
import { TrailPriorityPropertySelect } from "../../entities/trail-priority-property-select";
import { TrailRelationPropertySelect } from "../../entities/trail-relation-property-select";
import { TrailStatusPropertySelect } from "../../entities/trail-status-property-select";
import { TrailViewPopover } from "../../patterns/trail-view-popover";
import { TrailButton } from "../../primitives/trail-button";
import { TrailIconButton } from "../../primitives/trail-icon-button";
import { TrailInput } from "../../primitives/trail-input";
import { TrailProgress } from "../../primitives/trail-progress";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailProjectInspectorActions = {
  readonly milestones: Pick<TrailUiActions["milestones"], "create">;
  readonly projects: Pick<
    TrailUiActions["projects"],
    "changeInitiative" | "changeStatus" | "editProperties"
  >;
};

type TrailProjectPropertyPatch =
  | { readonly kind: "due"; readonly value: TrailProject["due"] }
  | { readonly kind: "labels"; readonly value: readonly string[] }
  | { readonly kind: "priority"; readonly value: TrailProject["priority"] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nextProjectProperties(
  readModel: TrailProjectInspectorReadModel,
  patch: TrailProjectPropertyPatch,
) {
  return {
    description: readModel.expectedProject.description,
    due: patch.kind === "due" ? patch.value : readModel.due,
    labelIds: patch.kind === "labels" ? patch.value : readModel.labelIds,
    priority: patch.kind === "priority" ? patch.value : readModel.priority,
    title: readModel.title,
  };
}

function progressLabel(progress: TrailProjectInspectorReadModel["progress"]): string {
  if (progress.unavailable === true) return "—";
  return `${Math.round((progress.value / progress.max) * 100)}%`;
}

function TrailAddIcon() {
  return (
    <svg aria-hidden="true" className="trail-projects-page__add-icon" viewBox="0 0 16 16">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function TrailMilestoneQuickCreate({
  disabled,
  onCreate,
  referenceTimestamp,
  timezone,
}: {
  readonly disabled: boolean;
  readonly onCreate: (title: string, due: number | undefined) => Promise<void>;
  readonly referenceTimestamp: number;
  readonly timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<number>();
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);

  const setQuickCreateOpen = (nextOpen: boolean) => {
    if (pending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setTitle("");
      setDue(undefined);
      setFeedback(undefined);
    }
  };

  const submit = async () => {
    const normalizedTitle = title.trim();
    if (pending || normalizedTitle.length === 0) return;
    setPending(true);
    setFeedback(undefined);
    try {
      await onCreate(normalizedTitle, due);
      setPending(false);
      setQuickCreateOpen(false);
    } catch (error: unknown) {
      setPending(false);
      setFeedback(`Create failed: ${errorMessage(error)}`);
    }
  };

  return (
    <TrailViewPopover
      align="end"
      label="New milestone"
      onOpenChange={setQuickCreateOpen}
      open={open}
      trigger={(
        <TrailIconButton
          disabled={disabled}
          icon={<TrailAddIcon />}
          label="Add milestone"
        />
      )}
      width="default"
    >
      <form
        className="trail-project-inspector__milestone-create"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="trail-view-popover__title">New milestone</div>
        <TrailInput
          aria-label="Milestone name"
          autoFocus
          disabled={pending}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="Milestone name"
          value={title}
        />
        <div className="trail-project-inspector__milestone-create-properties">
          <TrailOptionalDuePropertySelect
            disabled={pending}
            onValueChange={setDue}
            referenceTimestamp={referenceTimestamp}
            timezone={timezone}
            value={due}
          />
        </div>
        {feedback === undefined ? null : (
          <div className="trail-project-inspector__feedback" role="alert">{feedback}</div>
        )}
        <div className="trail-project-inspector__milestone-create-actions">
          <TrailButton disabled={pending} onClick={() => setQuickCreateOpen(false)} type="button">
            Cancel
          </TrailButton>
          <TrailButton
            disabled={pending || title.trim().length === 0}
            type="submit"
            variant="primary"
          >
            Create
          </TrailButton>
        </div>
      </form>
    </TrailViewPopover>
  );
}

export interface TrailProjectInspectorProps {
  readonly actions: TrailProjectInspectorActions;
  readonly projectId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

export function TrailProjectInspector({
  actions,
  projectId,
  runtimeStore,
}: TrailProjectInspectorProps) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const now = Date.now();
  const readModel = selectTrailProjectInspectorReadModel(state, projectId, now);
  const [feedback, setFeedback] = useState<string>();
  const [pending, setPending] = useState(false);

  if (readModel === null) {
    return (
      <aside
        aria-label="Trail inspector"
        className="trail-inspector trail-project-inspector"
        data-target-kind="project"
      >
        <header className="trail-inspector__header">
          <span className="trail-inspector__eyebrow">Project</span>
          <h2>Unavailable</h2>
        </header>
        <p className="trail-inspector__placeholder">Project data is not available.</p>
      </aside>
    );
  }

  const settle = async (
    action: () => ReturnType<TrailProjectInspectorActions["projects"]["changeStatus"]>,
  ): Promise<void> => {
    if (pending) return;
    setFeedback(undefined);
    let result: ReturnType<TrailProjectInspectorActions["projects"]["changeStatus"]>;
    try {
      result = action();
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return;
    }
    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return;
    }
    if (result.kind === "unchanged") return;
    setPending(true);
    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
    } finally {
      setPending(false);
    }
  };

  const saveProperty = (patch: TrailProjectPropertyPatch) => settle(() => (
    actions.projects.editProperties(
      readModel.expectedProject,
      nextProjectProperties(readModel, patch),
    )
  ));

  const timezone = readModel.configuration.temporal.timezone;

  return (
    <aside
      aria-label="Trail inspector"
      className="trail-inspector trail-project-inspector"
      data-target-kind="project"
    >
      <header className="trail-inspector__header">
        <span className="trail-inspector__eyebrow">Project</span>
        <h2>{readModel.title}</h2>
      </header>

      <section aria-label="Project properties" className="trail-project-inspector__section">
        <h3 className="trail-project-inspector__section-title">Properties</h3>
        <div className="trail-project-inspector__properties">
          <div className="trail-project-inspector__property-row">
            <span className="trail-project-inspector__property-label">Status</span>
            <span className="trail-project-inspector__property-control">
              <TrailStatusPropertySelect
                category={readModel.status.category}
                disabled={pending}
                entityType="project"
                label={readModel.status.label}
                onValueChange={(statusDefinitionId) => {
                  void settle(() => actions.projects.changeStatus(
                    readModel.expectedProject,
                    statusDefinitionId,
                  ));
                }}
                options={readModel.statusOptionGroups}
                value={readModel.status.id}
              />
            </span>
          </div>
          <div className="trail-project-inspector__property-row">
            <span className="trail-project-inspector__property-label">Initiative</span>
            <span className="trail-project-inspector__property-control">
              <TrailRelationPropertySelect
                disabled={pending}
                label="Initiative"
                noneLabel="No initiative"
                onValueChange={(initiativeId) => {
                  void settle(() => actions.projects.changeInitiative(
                    readModel.expectedProject,
                    initiativeId,
                  ));
                }}
                options={readModel.initiativeTargets}
                value={readModel.initiativeId}
              />
            </span>
          </div>
          <div className="trail-project-inspector__property-row">
            <span className="trail-project-inspector__property-label">Priority</span>
            <span className="trail-project-inspector__property-control">
              <TrailPriorityPropertySelect
                disabled={pending}
                onValueChange={(priority) => { void saveProperty({ kind: "priority", value: priority }); }}
                value={readModel.priority}
              />
            </span>
          </div>
          <div className="trail-project-inspector__property-row">
            <span className="trail-project-inspector__property-label">Labels</span>
            <span className="trail-project-inspector__property-control">
              <TrailLabelPropertySelect
                disabled={pending}
                entityType="project"
                groups={readModel.configuration.labelGroups}
                labels={readModel.configuration.labels}
                onValueChange={(labelIds) => { void saveProperty({ kind: "labels", value: labelIds }); }}
                value={readModel.labelIds}
              />
            </span>
          </div>
          <div className="trail-project-inspector__property-row">
            <span className="trail-project-inspector__property-label">Due</span>
            <span className="trail-project-inspector__property-control">
              <TrailOptionalDuePropertySelect
                disabled={pending}
                onValueChange={(due) => { void saveProperty({ kind: "due", value: due }); }}
                referenceTimestamp={now}
                timezone={timezone}
                value={readModel.due}
              />
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Project progress" className="trail-project-inspector__section">
        <div className="trail-project-inspector__section-heading">
          <h3 className="trail-project-inspector__section-title">Progress</h3>
          <span className="trail-project-inspector__section-value">
            {progressLabel(readModel.progress)}
          </span>
        </div>
        {readModel.progress.unavailable === true ? (
          <TrailProgress label="Project progress" unavailable />
        ) : (
          <TrailProgress
            label="Project progress"
            max={readModel.progress.max}
            value={readModel.progress.value}
          />
        )}
      </section>

      <section aria-label="Project temporal attention" className="trail-project-inspector__section">
        <h3 className="trail-project-inspector__section-title">Attention</h3>
        <div className="trail-project-inspector__attention">
          <div className="trail-project-inspector__attention-segment">
            <span>Overdue</span>
            <strong>{readModel.attention.overdue}</strong>
          </div>
          <div className="trail-project-inspector__attention-segment">
            <span>This week</span>
            <strong>{readModel.attention.thisWeek}</strong>
          </div>
          <div className="trail-project-inspector__attention-segment">
            <span>Later</span>
            <strong>{readModel.attention.later}</strong>
          </div>
        </div>
      </section>

      <section aria-label="Project milestones" className="trail-project-inspector__section">
        <div className="trail-project-inspector__section-heading">
          <h3 className="trail-project-inspector__section-title">Milestones</h3>
          <TrailMilestoneQuickCreate
            disabled={pending || state.control.kind !== "ready"}
            onCreate={async (title, due) => {
              const receipt = actions.milestones.create(readModel.expectedProject.id, title, due);
              await receipt.completion;
            }}
            referenceTimestamp={now}
            timezone={timezone}
          />
        </div>
        <div className="trail-project-inspector__milestones">
          {readModel.milestones.map((milestone) => (
            <div className="trail-project-inspector__milestone" key={milestone.id}>
              <div className="trail-project-inspector__milestone-identity">
                <span className="trail-project-inspector__milestone-title">{milestone.title}</span>
                {milestone.due === undefined ? null : (
                  <TrailDueDate timestamp={milestone.due} timezone={timezone} />
                )}
              </div>
              <div className="trail-project-inspector__milestone-progress">
                {milestone.progress.unavailable === true ? (
                  <TrailProgress density="micro" label={`${milestone.title} progress`} unavailable />
                ) : (
                  <TrailProgress
                    density="micro"
                    label={`${milestone.title} progress`}
                    max={milestone.progress.max}
                    value={milestone.progress.value}
                  />
                )}
                <span>{progressLabel(milestone.progress)}</span>
              </div>
            </div>
          ))}
          {readModel.milestones.length === 0 ? (
            <div className="trail-project-inspector__milestones-empty">No milestones</div>
          ) : null}
        </div>
      </section>

      {feedback === undefined ? null : (
        <div className="trail-project-inspector__feedback" role="alert">{feedback}</div>
      )}
    </aside>
  );
}
