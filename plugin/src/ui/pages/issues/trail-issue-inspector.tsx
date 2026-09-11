import { useState } from "react";
import { useStore } from "zustand";

import type { TrailWorkflowIssue } from "../../../domain/model/trail-entities";
import {
  selectTrailIssueInspectorReadModel,
  type TrailIssueInspectorReadModel,
} from "../../../query/issues/trail-issue-inspector-query";
import type { TrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { TrailDueDate } from "../../entities/trail-due";
import { TrailEstimatePropertySelect } from "../../entities/trail-estimate-property-select";
import { TrailLabelPropertySelect } from "../../entities/trail-label-property-select";
import { TrailOptionalDuePropertySelect } from "../../entities/trail-optional-due-property-select";
import { TrailPriorityPropertySelect } from "../../entities/trail-priority-property-select";
import { TrailRelationPropertySelect } from "../../entities/trail-relation-property-select";
import { TrailStatusPropertySelect } from "../../entities/trail-status-property-select";
import { TrailButton } from "../../primitives/trail-button";
import type { TrailUiActions } from "../../shell/trail-ui-actions";

type TrailIssueInspectorActions = {
  readonly cycles: Pick<TrailUiActions["cycles"], "changeMembership">;
  readonly issues: Pick<
    TrailUiActions["issues"],
    "changeMilestone" | "changeStatus" | "editProperties" | "moveToProject"
  >;
};

type TrailIssuePropertyPatch =
  | { readonly kind: "due"; readonly value: TrailWorkflowIssue["due"] }
  | { readonly kind: "estimate"; readonly value: TrailWorkflowIssue["estimate"] }
  | { readonly kind: "labels"; readonly value: readonly string[] }
  | { readonly kind: "priority"; readonly value: TrailWorkflowIssue["priority"] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nextIssueProperties(
  readModel: TrailIssueInspectorReadModel,
  patch: TrailIssuePropertyPatch,
) {
  return {
    description: readModel.expectedIssue.description,
    due: patch.kind === "due" ? patch.value : readModel.due,
    estimate: patch.kind === "estimate" ? patch.value : readModel.estimate,
    labelIds: patch.kind === "labels" ? patch.value : readModel.labelIds,
    priority: patch.kind === "priority" ? patch.value : readModel.priority,
    title: readModel.title,
  };
}

export interface TrailIssueInspectorProps {
  readonly actions: TrailIssueInspectorActions;
  readonly issueId: string;
  readonly runtimeStore: TrailRuntimeStore;
}

export function TrailIssueInspector({
  actions,
  issueId,
  runtimeStore,
}: TrailIssueInspectorProps) {
  const state = useStore(runtimeStore, (runtimeState) => runtimeState);
  const readModel = selectTrailIssueInspectorReadModel(state, issueId);
  const [feedback, setFeedback] = useState<string>();

  if (readModel === null) {
    return (
      <aside
        aria-label="Trail inspector"
        className="trail-inspector trail-issue-inspector"
        data-target-kind="issue"
      >
        <header className="trail-inspector__header">
          <span className="trail-inspector__eyebrow">Issue</span>
          <h2>Unavailable</h2>
        </header>
        <p className="trail-inspector__placeholder">Issue data is not available.</p>
      </aside>
    );
  }

  const latestReadModel = (): TrailIssueInspectorReadModel => {
    const latest = selectTrailIssueInspectorReadModel(runtimeStore.getState(), issueId);
    if (latest === null) throw new Error("This issue is no longer available.");
    return latest;
  };

  const settleIssue = async (
    action: (
      latest: TrailIssueInspectorReadModel,
    ) => ReturnType<TrailIssueInspectorActions["issues"]["changeStatus"]>,
  ): Promise<void> => {
    setFeedback(undefined);
    let result: ReturnType<TrailIssueInspectorActions["issues"]["changeStatus"]>;
    try {
      result = action(latestReadModel());
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return;
    }
    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return;
    }
    if (result.kind === "unchanged") return;
    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
    }
  };

  const settleCycle = async () => {
    setFeedback(undefined);
    let result: ReturnType<TrailIssueInspectorActions["cycles"]["changeMembership"]>;
    try {
      const latest = latestReadModel();
      if (latest.currentCycle === undefined) return;
      const cycle = latest.currentCycle.expectedCycle;
      const issueIds = latest.currentCycle.isMember
        ? cycle.issueIds.filter((candidateId) => candidateId !== latest.expectedIssue.id)
        : [...cycle.issueIds, latest.expectedIssue.id];
      result = actions.cycles.changeMembership(cycle, issueIds);
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
      return;
    }
    if (result.kind === "needs-input") {
      setFeedback(result.input.message);
      return;
    }
    if (result.kind === "unchanged") return;
    try {
      await result.receipt.completion;
    } catch (error: unknown) {
      setFeedback(`Save failed: ${errorMessage(error)}`);
    }
  };

  const saveProperty = (patch: TrailIssuePropertyPatch) => settleIssue((latest) => (
    actions.issues.editProperties(
      latest.expectedIssue,
      nextIssueProperties(latest, patch),
    )
  ));

  const timezone = readModel.configuration.temporal.timezone;
  const completed = readModel.status.category === "completed";

  return (
    <aside
      aria-label="Trail inspector"
      className="trail-inspector trail-issue-inspector"
      data-target-kind="issue"
    >
      <header className="trail-inspector__header">
        <span className="trail-inspector__eyebrow">Issue</span>
        <h2>{readModel.title}</h2>
      </header>

      <section aria-label="Issue properties" className="trail-issue-inspector__section">
        <h3 className="trail-issue-inspector__section-title">Properties</h3>
        <div className="trail-issue-inspector__properties">
          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Status</span>
            <span className="trail-issue-inspector__property-control">
              <TrailStatusPropertySelect
                category={readModel.status.category}
                disabled={!readModel.capabilities.canChangeStatus}
                entityType="issue"
                label={readModel.status.label}
                onValueChange={(statusDefinitionId) => {
                  void settleIssue((latest) => actions.issues.changeStatus(
                    latest.expectedIssue,
                    statusDefinitionId,
                    latest.estimate,
                  ));
                }}
                options={readModel.statusOptionGroups}
                value={readModel.status.id}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Project</span>
            <span className="trail-issue-inspector__property-control">
              <TrailRelationPropertySelect
                disabled={!readModel.capabilities.canMoveOut}
                label="Project"
                noneLabel="Choose project"
                onValueChange={(projectId) => {
                  if (projectId === undefined) return;
                  void settleIssue((latest) => actions.issues.moveToProject(
                    latest.expectedIssue,
                    projectId,
                  ));
                }}
                options={readModel.projectTargets}
                required
                searchable
                value={readModel.project.id}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Priority</span>
            <span className="trail-issue-inspector__property-control">
              <TrailPriorityPropertySelect
                disabled={!readModel.capabilities.canEditPlanningFields}
                onValueChange={(priority) => { void saveProperty({ kind: "priority", value: priority }); }}
                value={readModel.priority}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Milestone</span>
            <span className="trail-issue-inspector__property-control">
              <TrailRelationPropertySelect
                disabled={!readModel.capabilities.canAssignMilestone}
                label="Milestone"
                noneLabel="No milestone"
                onValueChange={(milestoneId) => {
                  void settleIssue((latest) => actions.issues.changeMilestone(
                    latest.expectedIssue,
                    milestoneId,
                  ));
                }}
                options={readModel.milestoneTargets}
                searchable
                value={readModel.milestoneId}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Labels</span>
            <span className="trail-issue-inspector__property-control">
              <TrailLabelPropertySelect
                disabled={!readModel.capabilities.canEditPlanningFields}
                entityType="issue"
                groups={readModel.configuration.labelGroups}
                labels={readModel.configuration.labels}
                onValueChange={(labelIds) => { void saveProperty({ kind: "labels", value: labelIds }); }}
                value={readModel.labelIds}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Due</span>
            <span className="trail-issue-inspector__property-control">
              <TrailOptionalDuePropertySelect
                disabled={!readModel.capabilities.canEditPlanningFields}
                onValueChange={(due) => { void saveProperty({ kind: "due", value: due }); }}
                referenceTimestamp={Date.now()}
                timezone={timezone}
                value={readModel.due}
              />
            </span>
          </div>

          <div className="trail-issue-inspector__property-row">
            <span className="trail-issue-inspector__property-label">Estimate</span>
            <span className="trail-issue-inspector__property-control">
              <TrailEstimatePropertySelect
                disabled={!readModel.capabilities.canEditPlanningFields}
                onValueChange={(estimate) => { void saveProperty({ kind: "estimate", value: estimate }); }}
                required={completed}
                value={readModel.estimate}
              />
            </span>
          </div>
        </div>
      </section>

      <section aria-label="Issue context" className="trail-issue-inspector__section">
        <h3 className="trail-issue-inspector__section-title">Context</h3>
        <div className="trail-issue-inspector__context-row">
          <span className="trail-issue-inspector__property-label">Current cycle</span>
          {readModel.currentCycle === undefined ? (
            <span className="trail-issue-inspector__context-empty">No current cycle</span>
          ) : (
            <span className="trail-issue-inspector__cycle-context">
              <span className="trail-issue-inspector__cycle-range">
                <TrailDueDate
                  timestamp={readModel.currentCycle.expectedCycle.startedAt}
                  timezone={timezone}
                />
                <span aria-hidden="true">–</span>
                <TrailDueDate
                  timestamp={readModel.currentCycle.expectedCycle.plannedEnd}
                  timezone={timezone}
                />
              </span>
              <TrailButton
                aria-label={readModel.currentCycle.isMember
                  ? "Remove from current cycle"
                  : "Add to current cycle"}
                disabled={!readModel.canChangeCurrentCycleMembership}
                onClick={() => { void settleCycle(); }}
              >
                {readModel.currentCycle.isMember ? "Remove" : "Add"}
              </TrailButton>
            </span>
          )}
        </div>
      </section>

      {feedback === undefined ? null : (
        <div className="trail-issue-inspector__feedback" role="alert">{feedback}</div>
      )}
    </aside>
  );
}
