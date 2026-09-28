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
