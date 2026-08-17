import type { TrailRuntimeStore } from "../runtime/store/trail-runtime-store";
import type { TrailAuthoritativeSourceSync } from "../source-sync/trail-authoritative-source-sync";
import { TrailCycleApplication } from "./cycles/trail-cycle-application";
import { TrailInitiativeApplication } from "./initiatives/trail-initiative-application";
import { TrailIssueApplication } from "./issues/trail-issue-application";
import { TrailMilestoneApplication } from "./milestones/trail-milestone-application";
import { TrailProjectApplication } from "./projects/trail-project-application";
import { TrailTriageApplication } from "./triage/trail-triage-application";
import type { TrailCommandEnvironment } from "./trail-command";

export interface TrailApplicationSession {
  readonly cycles: TrailCycleApplication;
  readonly initiatives: TrailInitiativeApplication;
  readonly issues: TrailIssueApplication;
  readonly milestones: TrailMilestoneApplication;
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
    cycles: new TrailCycleApplication(input.runtimeStore, input.sourceSync, input.environment),
    initiatives: new TrailInitiativeApplication(input.runtimeStore, input.sourceSync, input.environment),
    issues: new TrailIssueApplication(input.runtimeStore, input.sourceSync, input.environment),
    milestones: new TrailMilestoneApplication(input.runtimeStore, input.sourceSync, input.environment),
    projects: new TrailProjectApplication(input.runtimeStore, input.sourceSync, input.environment),
    triage: new TrailTriageApplication(input.runtimeStore, input.sourceSync, input.environment),
  };
}
