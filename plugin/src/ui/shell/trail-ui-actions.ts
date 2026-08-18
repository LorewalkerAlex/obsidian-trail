import type { TrailApplicationSession } from "../../application/trail-application-session";

/** UI-facing use-case surface; host/source-sync mechanics never cross this boundary. */
export interface TrailUiActions {
  readonly initiatives: Pick<
    TrailApplicationSession["initiatives"],
    "create"
  >;
  readonly issues: Pick<
    TrailApplicationSession["issues"],
    "changeStatus" | "create" | "moveToProject"
  >;
  readonly projects: Pick<
    TrailApplicationSession["projects"],
    "changeInitiative" | "changeStatus" | "create"
  >;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "capture" | "convertToProject" | "defer" | "delete" | "edit"
  >;
}
