import type { TrailApplicationSession } from "../../application/trail-application-session";
import type { TrailWeeklyNoteApplication } from "../../application/workspace/trail-weekly-note-application";

/** UI-facing use-case surface; host/source-sync mechanics never cross this boundary. */
export interface TrailUiActions {
  readonly cycles: Pick<
    TrailApplicationSession["cycles"],
    "changeMembership" | "close" | "start"
  >;
  readonly initiatives: Pick<
    TrailApplicationSession["initiatives"],
    "create" | "editProperties"
  >;
  readonly issues: Pick<
    TrailApplicationSession["issues"],
    "changeMilestone" | "changeStatus" | "create" | "editProperties" | "moveToProject"
  >;
  readonly milestones: Pick<
    TrailApplicationSession["milestones"],
    "create" | "delete" | "editProperties"
  >;
  readonly projects: Pick<
    TrailApplicationSession["projects"],
    "changeInitiative" | "changeStatus" | "create" | "editProperties"
  >;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "capture" | "convertToProject" | "create" | "defer" | "delete" | "edit"
  >;
  readonly weeklyNote: Pick<
    TrailWeeklyNoteApplication,
    "archiveCurrent" | "load" | "replaceCurrent"
  >;
}
