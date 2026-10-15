import type { TrailApplicationSession } from "../../application/trail-application-session";
import type { TrailWeeklyNoteApplication } from "../../application/workspace/trail-weekly-note-application";

/** UI-facing use-case surface; host/source-sync mechanics never cross this boundary. */
export interface TrailUiActions {
  readonly cycles: Pick<
    TrailApplicationSession["cycles"],
    "changeMembership" | "changePlannedEnd" | "close" | "closeAndStartNext" | "start"
  >;
  readonly initiatives: Pick<
    TrailApplicationSession["initiatives"],
    "create" | "delete" | "editProperties"
  >;
  readonly issues: Pick<
    TrailApplicationSession["issues"],
    "changeMilestone" | "changeStatus" | "create" | "createFromDraft" | "delete" | "editProperties" | "moveToProject"
  >;
  readonly milestones: Pick<
    TrailApplicationSession["milestones"],
    "create" | "delete" | "editProperties"
  >;
  readonly projects: Pick<
    TrailApplicationSession["projects"],
    "changeInitiative" | "changeStatus" | "create" | "createFromDraft" | "editProperties"
  > & Partial<Pick<TrailApplicationSession["projects"], "delete">>;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "acceptFromDraft" | "capture" | "convertToProject" | "convertToProjectFromDraft"
    | "create" | "defer" | "delete" | "edit"
  >;
  readonly weeklyNote: Pick<
    TrailWeeklyNoteApplication,
    "archiveCurrent" | "load" | "replaceCurrent"
  >;
}

export type TrailProjectDeleteAction = NonNullable<TrailUiActions["projects"]["delete"]>;
export type TrailCyclePageActions = Pick<
  TrailUiActions["cycles"],
  "changeMembership"
> & Pick<TrailUiActions["issues"], "changeStatus">;
export type TrailProjectCollectionActions = Pick<
  TrailUiActions["projects"],
  "changeInitiative" | "changeStatus"
>;

/** Keeps the Cycle and Issue Application receivers across the combined Cycle Page boundary. */
export function bindTrailCyclePageActions(
  cycles: Pick<TrailUiActions["cycles"], "changeMembership">,
  issues: Pick<TrailUiActions["issues"], "changeStatus">,
): TrailCyclePageActions {
  const changeMembership = cycles.changeMembership;
  const changeStatus = issues.changeStatus;
  return {
    changeMembership: (expectedCycle, issueIds) => changeMembership.call(
      cycles,
      expectedCycle,
      issueIds,
    ),
    changeStatus: (expectedIssue, targetStatusDefinitionId, estimate) => changeStatus.call(
      issues,
      expectedIssue,
      targetStatusDefinitionId,
      estimate,
    ),
  };
}

type TrailProjectCollectionActionSource = Partial<TrailProjectCollectionActions>;

/** Keeps the Project Application receiver across Project collection action boundaries. */
export function bindTrailProjectCollectionActions(
  projects: TrailProjectCollectionActionSource | undefined,
): TrailProjectCollectionActions | undefined {
  if (projects?.changeInitiative === undefined || projects.changeStatus === undefined) {
    return undefined;
  }
  const changeInitiative = projects.changeInitiative;
  const changeStatus = projects.changeStatus;
  return {
    changeInitiative: (expectedProject, targetInitiativeId) => changeInitiative.call(
      projects,
      expectedProject,
      targetInitiativeId,
    ),
    changeStatus: (expectedProject, targetStatusDefinitionId) => changeStatus.call(
      projects,
      expectedProject,
      targetStatusDefinitionId,
    ),
  };
}

/** Keeps the Project Application receiver when Delete crosses the callback prop boundary. */
export function bindTrailProjectDeleteAction(
  projects: TrailUiActions["projects"] | undefined,
): TrailProjectDeleteAction | undefined {
  if (projects === undefined) return undefined;
  const deleteProject = projects.delete;
  if (deleteProject === undefined) return undefined;
  return (expectedProject, replacementProjectId) => deleteProject.call(
    projects,
    expectedProject,
    replacementProjectId,
  );
}
