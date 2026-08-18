import { useState, type ReactNode, type SyntheticEvent } from "react";
import { useStore } from "zustand";

import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { selectIsTrailEntityPending } from "../../query/shared/trail-effective-query";
import { selectTrailEntitySourceIssues } from "../../query/shared/trail-source-health-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import {
  TrailDialog,
  TrailDialogActions,
  TrailDialogClose,
} from "../primitives/trail-dialog";
import type { TrailUiActions } from "../shell/trail-ui-actions";
import { runTrailMutationAction } from "./trail-action";

function issueActionsDisabled(
  runtimeStore: TrailRuntimeStore,
  issueId: string,
  writable: boolean,
): boolean {
  if (!writable) return true;
  const state = runtimeStore.getState();
  return selectIsTrailEntityPending(state, issueId)
    || selectTrailEntitySourceIssues(state, issueId).length > 0;
}

/**
 * Owns the one Workflow Status mutation flow shared by List rows and Board
 * cards, including the canonical Estimate NeedsInput completion gate.
 */
export function useTrailWorkflowIssueStatusMutation(input: {
  readonly actions: TrailUiActions["issues"];
  readonly onError: (message: string | undefined) => void;
  readonly runtimeStore: TrailRuntimeStore;
  readonly writable: boolean;
}): {
  readonly completionDialog: ReactNode;
  readonly requestStatus: (issue: TrailWorkflowIssue, targetStatusDefinitionId: string) => void;
} {
  const [completionBaseline, setCompletionBaseline] = useState<TrailWorkflowIssue>();
  const [completionTargetId, setCompletionTargetId] = useState<string>();
  const [estimateDraft, setEstimateDraft] = useState("");
  const completionGateOpen = completionBaseline !== undefined && completionTargetId !== undefined;
  const completionActionsDisabled = useStore(input.runtimeStore, (state) => (
    completionBaseline === undefined
    || !input.writable
    || selectIsTrailEntityPending(state, completionBaseline.id)
    || selectTrailEntitySourceIssues(state, completionBaseline.id).length > 0
  ));

  const clearCompletionGate = (): void => {
    setCompletionBaseline(undefined);
    setCompletionTargetId(undefined);
    setEstimateDraft("");
  };

  const requestStatus = (
    issue: TrailWorkflowIssue,
    targetStatusDefinitionId: string,
  ): void => {
    if (
      targetStatusDefinitionId === issue.statusDefinitionId
      || issueActionsDisabled(input.runtimeStore, issue.id, input.writable)
    ) return;

    runTrailMutationAction(
      () => input.actions.changeStatus(issue, targetStatusDefinitionId),
      {
        onError: input.onError,
        onNeedsInput: (request) => {
          if (request.code !== "estimate-required") {
            input.onError(request.message);
            return;
          }
          setCompletionBaseline(issue);
          setCompletionTargetId(targetStatusDefinitionId);
          setEstimateDraft(issue.estimate?.toString() ?? "");
        },
      },
    );
  };

  const submitEstimate = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (
      completionBaseline === undefined
      || completionTargetId === undefined
      || estimateDraft.trim() === ""
      || issueActionsDisabled(input.runtimeStore, completionBaseline.id, input.writable)
    ) return;

    const estimate = Number(estimateDraft);
    runTrailMutationAction(
      () => input.actions.changeStatus(completionBaseline, completionTargetId, estimate),
      {
        onError: input.onError,
        onNeedsInput: (request) => input.onError(request.message),
        onSettled: clearCompletionGate,
      },
    );
  };

  const completionDialog = (
    <TrailDialog
      description={completionBaseline === undefined
        ? "Add an Estimate before completing this Workflow Issue."
        : `Add an Estimate before moving ${completionBaseline.title} to Completed.`}
      onOpenChange={(open) => {
        if (!open) clearCompletionGate();
      }}
      open={completionGateOpen}
      title="Estimate required to complete"
    >
      <form className="trail-dialog-form" onSubmit={submitEstimate}>
        <label className="trail-dialog__field">
          <span>Estimate</span>
          <input
            disabled={completionActionsDisabled}
            min="0"
            onChange={(event) => setEstimateDraft(event.target.value)}
            step="1"
            type="number"
            value={estimateDraft}
          />
        </label>
        <TrailDialogActions>
          <TrailDialogClose>
            <button type="button">Cancel</button>
          </TrailDialogClose>
          <button
            className="mod-cta"
            disabled={completionActionsDisabled || estimateDraft.trim() === ""}
            type="submit"
          >
            Complete
          </button>
        </TrailDialogActions>
      </form>
    </TrailDialog>
  );

  return { completionDialog, requestStatus };
}
