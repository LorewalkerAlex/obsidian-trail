import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailProject, TrailWorkflowIssue } from "../../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import type {
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../../interactions/trail-action-menu";
import { TrailActionMenuProvider } from "../../interactions/trail-action-menu-context";
import { TrailProjectDeleteAction } from "./trail-project-delete-action";

function project(id: string, title: string): TrailProject {
  return {
    id,
    labelIds: [],
    statusDefinitionId: "project-started",
    title,
  };
}

function readyStore(input: {
  readonly defaultProjectId: string;
  readonly issues?: readonly TrailWorkflowIssue[];
  readonly projects: readonly TrailProject[];
}) {
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(input.defaultProjectId),
    },
    sources: input.projects.map((projectValue, index) => ({
      issues: (input.issues ?? []).filter(({ projectId }) => projectId === projectValue.id),
      kind: "project" as const,
      milestones: [],
      project: projectValue,
      sourcePath: `Trail/Projects/${String(index + 1).padStart(4, "0")} ${projectValue.title}.md`,
    })),
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return store;
}

interface CapturedActionMenuRequest {
  readonly items: TrailActionMenuRequest["items"];
  readonly onSelect: (actionId: string, targetId?: string) => void | Promise<void>;
  readonly unavailableReason: string | undefined;
}

function presenterCapture() {
  let request: CapturedActionMenuRequest | undefined;
  const capture = <TActionId extends string>(nextRequest: TrailActionMenuRequest<TActionId>) => {
    request = {
      items: nextRequest.items,
      onSelect: (actionId, targetId) => {
        const item = nextRequest.items.find(({ id }) => id === actionId);
        if (item === undefined) throw new Error(`Unknown captured action: ${actionId}`);
        return nextRequest.onSelect(item.id, targetId);
      },
      unavailableReason: nextRequest.unavailableReason,
    };
  };
  const presenter: TrailActionMenuPresenter = {
    showAtMouseEvent(_event, nextRequest) {
      capture(nextRequest);
    },
    showAtPosition(_position, nextRequest) {
      capture(nextRequest);
    },
  };
  return {
    presenter,
    request: () => request,
  };
}

describe("Project Delete Action", () => {
  it("opens the destructive Project action and submits a childless deletion", async () => {
    const source = project("project-source", "Source");
    const replacement = project("project-replacement", "Replacement");
    const store = readyStore({
      defaultProjectId: replacement.id,
      projects: [source, replacement],
    });
    const menu = presenterCapture();
    const onDelete = vi.fn(() => ({
      kind: "submitted" as const,
      receipt: { commandId: "delete-project", completion: Promise.resolve(), entityId: source.id },
    }));
    const onDeleted = vi.fn();

    render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <TrailProjectDeleteAction
          onDelete={onDelete}
          onDeleted={onDeleted}
          projectId={source.id}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    expect(menu.request()?.items).toEqual([expect.objectContaining({
      group: "destructive",
      id: "project.delete",
      label: "Delete project",
    })]);

    await act(async () => {
      await menu.request()?.onSelect("project.delete");
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));

    expect(onDelete).toHaveBeenCalledWith(source, undefined);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("requires one legal replacement Project when child Issues exist", async () => {
    const source = project("project-source", "Source");
    const replacement = project("project-replacement", "Replacement");
    const issue: TrailWorkflowIssue = {
      context: "workflow",
      createdAt: 1,
      id: "issue-a",
      labelIds: [],
      projectId: source.id,
      statusDefinitionId: "issue-started",
      title: "Issue A",
    };
    const store = readyStore({
      defaultProjectId: replacement.id,
      issues: [issue],
      projects: [source, replacement],
    });
    const menu = presenterCapture();
    const onDelete = vi.fn(() => ({
      kind: "submitted" as const,
      receipt: { commandId: "delete-project", completion: Promise.resolve(), entityId: source.id },
    }));

    render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <TrailProjectDeleteAction
          onDelete={onDelete}
          onDeleted={vi.fn()}
          projectId={source.id}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    await act(async () => {
      await menu.request()?.onSelect("project.delete");
    });

    const confirm = screen.getByRole("button", { name: "Delete project" });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Replacement project: Select project" }));
    fireEvent.click(screen.getByRole("button", { name: replacement.title }));
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    expect(onDelete).toHaveBeenCalledWith(source, replacement.id);
  });

  it("returns Escape dismissal to the Project Workspace parent instead of the overflow trigger", async () => {
    const source = project("project-source", "Source");
    const replacement = project("project-replacement", "Replacement");
    const store = readyStore({
      defaultProjectId: replacement.id,
      projects: [source, replacement],
    });
    const menu = presenterCapture();
    const { container } = render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <section className="trail-project-workspace-page" tabIndex={-1}>
          <TrailProjectDeleteAction
            onDelete={vi.fn()}
            onDeleted={vi.fn()}
            projectId={source.id}
            runtimeStore={store}
          />
        </section>
      </TrailActionMenuProvider>,
    );
    const page = container.querySelector<HTMLElement>(".trail-project-workspace-page");
    expect(page).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    await act(async () => {
      await menu.request()?.onSelect("project.delete");
    });
    const dialog = screen.getByRole("dialog", { name: "Delete project" });

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Delete project" })).not.toBeInTheDocument();
      expect(page).toHaveFocus();
      expect(screen.getByRole("button", { name: "More project actions" })).not.toHaveFocus();
    });
  });

  it("keeps the Workspace Default Project undeletable with a Settings recovery path", () => {
    const source = project("project-source", "Source");
    const store = readyStore({ defaultProjectId: source.id, projects: [source] });
    const menu = presenterCapture();

    render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <TrailProjectDeleteAction
          onDelete={vi.fn()}
          onDeleted={vi.fn()}
          projectId={source.id}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    expect(menu.request()?.items).toEqual([]);
    expect(menu.request()?.unavailableReason).toMatch(/Default Project/);
    expect(menu.request()?.unavailableReason).toMatch(/settings/);
  });
});
