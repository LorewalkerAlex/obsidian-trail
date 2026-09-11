import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailMutationActionResult } from "../../../application/trail-application-support";
import type { TrailInitiative, TrailProject } from "../../../domain/model/trail-entities";
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
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import { TrailInitiativePage } from "./trail-initiative-page";
import { TrailProjectsPage } from "./trail-projects-page";

interface CapturedMenu {
  readonly actionIds: readonly string[];
  readonly select: (actionId: string, targetId?: string) => Promise<void>;
}

function createCapturingPresenter() {
  let current: CapturedMenu | null = null;
  const capture = <TActionId extends string>(request: TrailActionMenuRequest<TActionId>) => {
    current = {
      actionIds: request.items.map(({ id }) => id),
      select: async (actionId, targetId) => {
        const action = request.items.find(({ id }) => id === actionId);
        if (action === undefined) throw new Error(`Unknown captured action: ${actionId}`);
        await request.onSelect(action.id, targetId);
      },
    };
  };
  const presenter: TrailActionMenuPresenter = {
    showAtMouseEvent<TActionId extends string>(
      _event: MouseEvent,
      request: TrailActionMenuRequest<TActionId>,
    ) {
      capture(request);
    },
    showAtPosition<TActionId extends string>(
      _position: { readonly x: number; readonly y: number },
      request: TrailActionMenuRequest<TActionId>,
    ) {
      capture(request);
    },
  };
  return {
    getCurrent: () => current,
    presenter,
  };
}

function readyStore() {
  const alpha: TrailInitiative = {
    id: "initiative-alpha",
    labelIds: [],
    title: "Alpha",
  };
  const beta: TrailInitiative = {
    id: "initiative-beta",
    labelIds: [],
    title: "Beta",
  };
  const projects: TrailProject[] = [
    {
      id: "project-a",
      initiativeId: alpha.id,
      labelIds: [],
      statusDefinitionId: "project-started",
      title: "Project A",
    },
    {
      id: "project-b",
      initiativeId: alpha.id,
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project B",
    },
    {
      id: "project-c",
      initiativeId: beta.id,
      labelIds: [],
      statusDefinitionId: "project-unstarted",
      title: "Project C",
    },
  ];
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(projects[0]?.id),
    },
    sources: [
      { initiative: alpha, kind: "initiative", sourcePath: "Trail/Initiatives/Alpha.md" },
      { initiative: beta, kind: "initiative", sourcePath: "Trail/Initiatives/Beta.md" },
      ...projects.map((project) => ({
        issues: [],
        kind: "project" as const,
        milestones: [],
        project,
        sourcePath: `Trail/Projects/${project.id}.md`,
      })),
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { alpha, store };
}

function projectActions() {
  const changeInitiative = vi.fn((project: TrailProject, _target?: string): TrailMutationActionResult => ({
    entityId: project.id,
    kind: "unchanged",
  }));
  const changeStatus = vi.fn((project: TrailProject, _target: string): TrailMutationActionResult => ({
    entityId: project.id,
    kind: "unchanged",
  }));
  return {
    actions: {
      changeInitiative,
      changeStatus,
      createFromDraft: vi.fn(() => ({
        commandId: "project-create",
        completion: Promise.resolve(),
        entityId: "created-project",
      })),
    },
    changeInitiative,
    changeStatus,
  };
}

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

describe("Project collection actions", () => {
  it("turns Projects Root selection into a bottom action bar with direct common mutations", () => {
    const { store } = readyStore();
    const { actions, changeStatus } = projectActions();
    render(
      <TrailProjectsPage
        actions={actions}
        onInitiativeActivate={vi.fn()}
        onProjectActivate={vi.fn()}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Project A" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Project B" }));

    const bulkBar = screen.getByRole("toolbar", { name: "Selection actions" });
    expect(bulkBar).toHaveTextContent("2 selected");
    fireEvent.click(within(bulkBar).getByRole("button", { name: "Status" }));
    const picker = screen.getByLabelText("Change status");
    fireEvent.click(within(picker).getByRole("button", { name: "canceled" }));
    expect(changeStatus).toHaveBeenCalledTimes(2);

    fireEvent.click(within(bulkBar).getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByRole("toolbar", { name: "Selection actions" })).not.toBeInTheDocument();
  });

  it("uses selection scope for right-click and keeps an unselected row entity-local", async () => {
    const { store } = readyStore();
    const { actions, changeInitiative, changeStatus } = projectActions();
    const menu = createCapturingPresenter();
    render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <TrailProjectsPage
          actions={actions}
          onInitiativeActivate={vi.fn()}
          onProjectActivate={vi.fn()}
          runtimeStore={store}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Project A" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Project B" }));
    fireEvent.contextMenu(screen.getByRole("button", { name: "Project A" }));

    const selectedMenu = menu.getCurrent();
    expect(selectedMenu?.actionIds).toEqual([
      "project.change-status",
      "project.change-initiative",
    ]);
    await selectedMenu?.select("project.change-initiative", "initiative-beta");
    expect(changeInitiative).toHaveBeenCalledTimes(2);

    changeInitiative.mockClear();
    changeStatus.mockClear();
    fireEvent.contextMenu(screen.getByRole("button", { name: "Project C" }));
    const singleMenu = menu.getCurrent();
    await singleMenu?.select("project.change-status", "project-started");
    expect(changeStatus).toHaveBeenCalledTimes(1);
    expect(changeStatus.mock.calls[0]?.[0].id).toBe("project-c");
    expect(screen.getByRole("checkbox", { name: "Deselect Project A" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Deselect Project B" })).toBeChecked();
  });

  it("reuses the same selection Action Registry inside Initiative Focus", () => {
    const { alpha, store } = readyStore();
    const { actions, changeInitiative } = projectActions();
    render(
      <TrailInitiativePage
        actions={actions}
        initiativeId={alpha.id}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Project A" }));
    const bulkBar = screen.getByRole("toolbar", { name: "Selection actions" });
    expect(bulkBar).toHaveTextContent("1 selected");
    fireEvent.click(within(bulkBar).getByRole("button", { name: "Initiative" }));
    const picker = screen.getByLabelText("Change initiative");
    fireEvent.click(within(picker).getByRole("button", { name: "Beta" }));
    expect(changeInitiative).toHaveBeenCalledTimes(1);
    expect(changeInitiative.mock.calls[0]?.[0].id).toBe("project-a");
    expect(changeInitiative).toHaveBeenCalledWith(expect.any(Object), "initiative-beta");
  });
});
