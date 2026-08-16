import type { TrailPluginDataIO } from "../../persistence/ports/trail-plugin-data-io";

export interface TrailObsidianPluginDataHost {
  readonly loadData: () => Promise<unknown>;
  readonly saveData: (data: unknown) => Promise<void>;
}

/** Thin adapter over Obsidian Plugin.loadData/saveData. */
export function createObsidianPluginDataIO(
  host: TrailObsidianPluginDataHost,
): TrailPluginDataIO {
  return {
    load: () => host.loadData(),
    save: (data) => host.saveData(data),
  };
}
