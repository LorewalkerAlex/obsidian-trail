export type TrailWorkspacePathKind = "directory" | "file" | "missing";

/** Host-facing path/layout capability kept separate from Markdown SourceIO semantics. */
export interface TrailWorkspaceLayoutIO {
  readonly createDirectory: (path: string) => Promise<void>;
  readonly pathKind: (path: string) => Promise<TrailWorkspacePathKind>;
  readonly removeDirectoryIfEmpty: (path: string) => Promise<void>;
}
