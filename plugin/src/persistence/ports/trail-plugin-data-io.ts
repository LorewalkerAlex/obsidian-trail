/** Thin host port over Obsidian Plugin.loadData/saveData. */
export interface TrailPluginDataIO {
  readonly load: () => Promise<unknown>;
  readonly save: (data: unknown) => Promise<void>;
}
