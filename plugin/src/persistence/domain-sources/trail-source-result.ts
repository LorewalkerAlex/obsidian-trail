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
