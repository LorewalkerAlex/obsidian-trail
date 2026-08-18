import type { TrailApplicationSession } from "../../application/trail-application-session";

/** UI-facing use-case surface; host/source-sync mechanics never cross this boundary. */
export interface TrailUiActions {
  readonly cycles: Pick<
    TrailApplicationSession["cycles"],
    "changeMembership" | "close" | "open"
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
    "create" | "delete"
  >;
  readonly projects: Pick<
    TrailApplicationSession["projects"],
    "changeInitiative" | "changeStatus" | "create" | "editProperties"
  >;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "capture" | "convertToProject" | "defer" | "delete" | "edit"
  >;
}
