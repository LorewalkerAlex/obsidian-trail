/**
 * Runtime-facing validation issue shared by all authoritative Markdown sources.
 * Specific parsers may export narrower aliases, but the Runtime keeps one shape.
 */
export interface TrailSourceIssue {
  readonly code: string;
  readonly filePath: string;
  readonly message: string;
  readonly objectId?: string;
  readonly offset?: number;
  readonly scope: "file" | "record";
}
