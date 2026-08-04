import { Plugin } from "obsidian";

import { TRAIL_VIEW_TYPE, TrailView } from "./trail-view";

export default class TrailPlugin extends Plugin {
  onload(): void {
    this.registerView(
      TRAIL_VIEW_TYPE,
      (leaf) => new TrailView(leaf),
    );

    this.addRibbonIcon("route", "Open trail", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => {
        void this.activateView();
      },
    });
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(TRAIL_VIEW_TYPE)[0];

    if (!leaf) {
      leaf = workspace.getLeaf("tab");

      await leaf.setViewState({
        type: TRAIL_VIEW_TYPE,
        active: true,
      });
    }

    await workspace.revealLeaf(leaf);
  }
}
