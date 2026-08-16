import type { TAbstractFile, TFile, TFolder } from "obsidian";

/** Runtime type predicates are injected so owner tests can use structural fakes. */
export interface TrailObsidianFileKinds {
  readonly isFile: (file: TAbstractFile | null) => file is TFile;
  readonly isFolder: (file: TAbstractFile | null) => file is TFolder;
}
