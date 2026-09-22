import { Notice } from "obsidian";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { resolveTrailTriageDefaultDue } from "../../domain/rules/trail-temporal-rules";
import { selectTrailReadableConfiguration } from "../../query/shared/trail-effective-query";
import type { TrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { TrailQuickCapture } from "../../ui/interactions/trail-quick-capture";
import type { TrailUiActions } from "../../ui/shell/trail-ui-actions";

type TrailQuickCaptureActions = Pick<TrailUiActions["triage"], "create">;

export class TrailQuickCaptureHost {
  private mountElement: HTMLDivElement | null = null;
  private root: Root | null = null;

  public constructor(
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly actions: TrailQuickCaptureActions,
  ) {}

  public open(): void {
    if (this.root !== null) return;

    const configuration = selectTrailReadableConfiguration(this.runtimeStore.getState());
    if (configuration === null) {
      new Notice("Trail is still loading. Try quick capture again in a moment.");
      return;
    }

    const defaultDue = resolveTrailTriageDefaultDue(
      Date.now(),
      configuration.temporal.timezone,
    );
    const mountElement = document.body.createDiv({ cls: "trail-quick-capture-host" });

    const root = createRoot(mountElement);
    this.mountElement = mountElement;
    this.root = root;
    root.render(
      <StrictMode>
        <TrailQuickCapture
          configuration={configuration}
          defaultDue={defaultDue}
          onCreate={async (input) => {
            const receipt = this.actions.create(input);
            await receipt.completion;
          }}
          onDismiss={() => this.close()}
        />
      </StrictMode>,
    );
  }

  public dispose(): void {
    this.close();
  }

  private close(): void {
    const root = this.root;
    const mountElement = this.mountElement;
    if (root === null || mountElement === null) return;

    this.root = null;
    this.mountElement = null;
    root.unmount();
    mountElement.remove();
  }
}
