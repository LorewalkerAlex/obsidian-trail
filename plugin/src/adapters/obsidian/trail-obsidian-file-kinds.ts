import type { TAbstractFile, TFile, TFolder } from "obsidian";

/** Runtime host guards supplied by the composition root for Obsidian file values. */
export interface ObsidianFileKinds {
  readonly isFile: (file: TAbstractFile | null) => file is TFile;
  readonly isFolder: (file: TAbstractFile | null) => file is TFolder;
}
