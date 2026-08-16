import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import { TrailIssueApplication } from "./issues/trail-issue-application";
import { TrailProjectApplication } from "./projects/trail-project-application";
import { TrailTriageApplication } from "./triage/trail-triage-application";
import type { TrailCommandEnvironment } from "./trail-command";

export interface TrailApplicationSession {
  readonly issues: TrailIssueApplication;
  readonly projects: TrailProjectApplication;
  readonly triage: TrailTriageApplication;
}

/** Builds stable use-case facades; each action reads the current effective Runtime at invocation time. */
export function createTrailApplicationSession(input: {
  readonly environment: TrailCommandEnvironment;
  readonly runtimeStore: TrailRuntimeStore;
  readonly sourceSync: TrailAuthoritativeSourceSync;
}): TrailApplicationSession {
  return {
    issues: new TrailIssueApplication(input.runtimeStore, input.sourceSync, input.environment),
    projects: new TrailProjectApplication(input.runtimeStore, input.sourceSync, input.environment),
    triage: new TrailTriageApplication(input.runtimeStore, input.sourceSync, input.environment),
  };
}
