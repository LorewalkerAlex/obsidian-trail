export interface TrailSourceEntry {
  readonly kind: "directory" | "file";
  readonly name: string;
  readonly path: string;
}

/** Thin host port for authoritative Markdown source I/O. */
export interface TrailSourceIO {
  readonly create: (path: string, content: string) => Promise<void>;
  readonly delete: (path: string) => Promise<void>;
  readonly list: (path: string) => Promise<readonly TrailSourceEntry[]>;
  readonly process: (
    path: string,
    transform: (latest: string) => string,
  ) => Promise<void>;
  readonly read: (path: string) => Promise<string>;
  readonly rename: (from: string, to: string) => Promise<void>;
}
