import type {
  TrailTriageIssue,
  TrailWorkflowIssue,
} from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";

/** Runtime-facing projection of the authoritative Triage source without parser metadata. */
export interface TrailTriageSourceSnapshot {
  readonly filePath: string;
  readonly issuesById: Readonly<Record<string, TrailTriageIssue>>;
}

/** Runtime-facing projection of one authoritative Project source without source ranges. */
export interface TrailProjectSourceSnapshot {
  readonly filePath: string;
  readonly issuesById: Readonly<Record<string, TrailWorkflowIssue>>;
  readonly project: TrailProject;
}
