import type { TrailProjectSourceSnapshot } from "./trail-domain-source-snapshot";

/** Logical source problem exposed above Persistence; parser offsets stay below this boundary. */
export interface TrailSourceProblem {
  readonly code: string;
  readonly filePath: string;
  readonly message: string;
  readonly objectId?: string;
  readonly scope: "file" | "record";
}

/** Authoritative Project-source result without Markdown ranges or parser-only carriers. */
export interface TrailProjectSourceResult {
  readonly contribution?: TrailProjectSourceSnapshot;
  readonly issues: readonly TrailSourceProblem[];
}

/** Attaches source location only after pure Domain validation has completed. */
export function toTrailSourceProblems(
  filePath: string,
  issues: readonly {
    readonly code: string;
    readonly entityId: string;
    readonly message: string;
  }[],
): readonly TrailSourceProblem[] {
  return issues.map((issue) => ({
    code: issue.code,
    filePath,
    message: issue.message,
    objectId: issue.entityId,
    scope: "record",
  }));
}
