import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { TrailApplicationActions } from "./application/trail-application-contracts";
import type {
  TrailRuntimeStore,
} from "./runtime/store/trail-runtime-store";
import {
  NOOP_TRAIL_DIAGNOSTICS,
  type TrailDiagnostics,
} from "./diagnostics/trail-diagnostics";
import { TrailApp } from "./ui/shell/trail-app";

export const TRAIL_VIEW_TYPE = "trail-view";

/**
 * Obsidian host view. React mounts once; Zustand selectors inside TrailApp own
 * incremental rendering instead of manually re-rendering the root on every store
 * notification through the host view.
 */
export class TrailView extends ItemView {
  private root: Root | null = null;

  public constructor(
    leaf: WorkspaceLeaf,
    private readonly runtimeStore: TrailRuntimeStore,
    private readonly application: TrailApplicationActions,
    private readonly diagnostics: TrailDiagnostics = NOOP_TRAIL_DIAGNOSTICS,
  ) {
    super(leaf);
  }

  public getViewType(): string {
    return TRAIL_VIEW_TYPE;
  }

  public getDisplayText(): string {
    return "Trail";
  }

  public getIcon(): string {
    return "route";
  }

  public async onOpen(): Promise<void> {
    this.diagnostics.record("view.opened", {
      data: { viewType: TRAIL_VIEW_TYPE },
    });
    this.contentEl.empty();
    this.contentEl.addClass("trail-view");

    const mountElement = this.contentEl.createDiv({
      cls: "trail-view__root",
    });

    this.root = createRoot(mountElement);
    this.root.render(
      <StrictMode>
        <TrailApp
          onAccept={(issue, projectId) =>
            this.application.acceptTriageIssue(issue, projectId)}
          onCapture={(title) => this.application.capture(title)}
          onCreateProject={(title) => this.application.createProject(title)}
          onCreateWorkflowIssue={(projectId, title) =>
            this.application.createWorkflowIssue(projectId, title)}
          onDefer={(issue) => this.application.deferTriageIssue(issue)}
          onDelete={(issue) => this.application.deleteTriageIssue(issue)}
          onEdit={(issue, title, dueLocalValue) =>
            this.application.editTriageIssue(issue, title, dueLocalValue)}
          onWorkflowStatusChange={(issue, targetStatusDefinitionId, estimate) =>
            this.application.changeWorkflowIssueStatus(
              issue,
              targetStatusDefinitionId,
              estimate,
            )}
          runtimeStore={this.runtimeStore}
        />
      </StrictMode>,
    );
  }

  public async onClose(): Promise<void> {
    this.diagnostics.record("view.closed", {
      data: { viewType: TRAIL_VIEW_TYPE },
    });
    this.root?.unmount();
    this.root = null;
    this.contentEl.empty();
  }
}