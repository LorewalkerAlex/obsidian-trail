import type { TrailDomainSourceSnapshot } from "./trail-domain-source-snapshot";
import type { TrailCodecIssue } from "../../markdown/codecs/trail-codec-support";
import type { TrailCyclesParseResult } from "../../markdown/codecs/trail-cycles-codec";
import type { TrailInitiativeParseResult } from "../../markdown/codecs/trail-initiative-codec";
import type { TrailProjectParseResult } from "../../markdown/codecs/trail-project-codec";
import type { TrailProjectlessIssuesParseResult } from "../../markdown/codecs/trail-projectless-issues-codec";
import type { TrailTriageParseResult } from "../../markdown/codecs/trail-triage-codec";

export type TrailSourceProblemStage =
  | "physical"
  | "field"
  | "domain"
  | "reference"
  | "workspace";

export type TrailSourceProblemEntityKind =
  | "initiative"
  | "project"
  | "milestone"
  | "issue"
  | "cycle";

export interface TrailSourceProblem {
  readonly code: string;
  readonly entityId?: string;
  readonly entityKind?: TrailSourceProblemEntityKind;
  readonly field?: string;
  readonly message: string;
  readonly scope: "source" | "entity";
  readonly severity: "error";
  readonly sourcePath: string;
  readonly stage: TrailSourceProblemStage;
}

export type TrailDomainSourceReadResult =
  | {
      readonly issues: readonly TrailSourceProblem[];
      readonly kind: "accepted";
      readonly snapshot: TrailDomainSourceSnapshot;
    }
  | {
      readonly issues: readonly TrailSourceProblem[];
      readonly kind: "rejected";
      readonly sourcePath: string;
    };

function toProblems(issues: readonly TrailCodecIssue[]): readonly TrailSourceProblem[] {
  return issues.map((issue) => ({
    code: issue.code,
    entityId: issue.entityId,
    entityKind: issue.entityKind,
    field: issue.field,
    message: issue.message,
    scope: issue.scope,
    severity: issue.severity,
    sourcePath: issue.sourcePath,
    stage: issue.stage,
  }));
}

export function initiativeSourceResult(
  result: TrailInitiativeParseResult,
  sourcePath: string,
): TrailDomainSourceReadResult {
  const issues = toProblems(result.issues);
  if (result.document === undefined) return { issues, kind: "rejected", sourcePath };
  return {
    issues,
    kind: "accepted",
    snapshot: {
      initiative: result.document.initiative,
      kind: "initiative",
      sourcePath,
    },
  };
}

export function projectSourceResult(
  result: TrailProjectParseResult,
  sourcePath: string,
): TrailDomainSourceReadResult {
  const issues = toProblems(result.issues);
  if (result.document === undefined) return { issues, kind: "rejected", sourcePath };
  return {
    issues,
    kind: "accepted",
    snapshot: {
      issues: result.document.issues,
      kind: "project",
      milestones: result.document.milestones,
      project: result.document.project,
      sourcePath,
    },
  };
}

export function triageSourceResult(
  result: TrailTriageParseResult,
  sourcePath: string,
): TrailDomainSourceReadResult {
  const issues = toProblems(result.issues);
  if (result.document === undefined) return { issues, kind: "rejected", sourcePath };
  return {
    issues,
    kind: "accepted",
    snapshot: {
      issues: result.document.issues,
      kind: "triage",
      sourcePath,
    },
  };
}

export function projectlessIssuesSourceResult(
  result: TrailProjectlessIssuesParseResult,
  sourcePath: string,
): TrailDomainSourceReadResult {
  const issues = toProblems(result.issues);
  if (result.document === undefined) return { issues, kind: "rejected", sourcePath };
  return {
    issues,
    kind: "accepted",
    snapshot: {
      issues: result.document.issues,
      kind: "projectless-issues",
      sourcePath,
    },
  };
}

export function cyclesSourceResult(
  result: TrailCyclesParseResult,
  sourcePath: string,
): TrailDomainSourceReadResult {
  const issues = toProblems(result.issues);
  if (result.document === undefined) return { issues, kind: "rejected", sourcePath };
  return {
    issues,
    kind: "accepted",
    snapshot: {
      cycles: result.document.cycles,
      kind: "cycles",
      sourcePath,
    },
  };
}
