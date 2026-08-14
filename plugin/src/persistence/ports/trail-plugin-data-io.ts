/** Thin host port for Obsidian plugin data.json I/O. */
export interface TrailPluginDataIO {
  readonly load: () => Promise<unknown>;
  readonly save: (data: unknown) => Promise<void>;
}
