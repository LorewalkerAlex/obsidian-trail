/** Minimal runtime surface for adapter tests; production resolves the real Obsidian host module. */
export class Modal {
  public readonly contentEl = {} as HTMLElement;

  public close(): void {}

  public open(): void {}
}

export class Notice {}

export class PluginSettingTab {
  public readonly app: unknown;

  public constructor(app: unknown) {
    this.app = app;
  }

  public update(): void {}
}

export class Setting {}
