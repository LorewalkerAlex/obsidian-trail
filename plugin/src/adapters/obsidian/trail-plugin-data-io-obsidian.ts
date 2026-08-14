import type { TrailPluginDataIO } from "../../persistence/ports/trail-plugin-data-io";

export interface ObsidianPluginDataHost {
  readonly loadData: () => Promise<unknown>;
  readonly saveData: (data: unknown) => Promise<void>;
}

/** Adapts Obsidian Plugin.loadData/saveData to the carrier-specific I/O port. */
export function createObsidianPluginDataIO(
  host: ObsidianPluginDataHost,
): TrailPluginDataIO {
  return {
    load: () => host.loadData(),
    save: (data) => host.saveData(data),
  };
}
