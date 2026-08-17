import type { TrailApplicationSession } from "../../application/trail-application-session";

/** UI-facing use-case surface; host/source-sync mechanics never cross this boundary. */
export interface TrailUiActions {
  readonly issues: Pick<TrailApplicationSession["issues"], "changeStatus" | "create">;
  readonly projects: Pick<TrailApplicationSession["projects"], "create">;
  readonly triage: Pick<
    TrailApplicationSession["triage"],
    "accept" | "capture" | "defer" | "delete" | "edit"
  >;
}
