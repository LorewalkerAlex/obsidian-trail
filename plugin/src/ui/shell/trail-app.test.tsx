import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  TrailProject,
  TrailTriageIssue,
} from "../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
} from "../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../test/trail-test-fixtures";
import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import type {
  TrailActionMenuPosition,
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../interactions/trail-action-menu";
import { TrailActionMenuProvider } from "../interactions/trail-action-menu-context";
import type { TrailMarkdownRender } from "../patterns/trail-page-narrative";
import { TrailApp } from "./trail-app";
import { createTrailNavigationStore } from "./trail-navigation-state";
import type { TrailUiActions } from "./trail-ui-actions";

const renderMarkdown: TrailMarkdownRender = (markdown, container) => {
  container.textContent = markdown;
  return {
    completion: Promise.resolve(),
    dispose: () => container.replaceChildren(),
  };
};

function mutationReceipt(entityId: string) {
  return {
    commandId: `command-${entityId}`,
    completion: Promise.resolve(),
    entityId,
  };
}

function homeCreationMenuPresenter() {
  let selectTriage: (() => void | Promise<void>) | null = null;
  const presenter: TrailActionMenuPresenter = {
    showAtMouseEvent<TActionId extends string>(
      _event: MouseEvent,
      _request: TrailActionMenuRequest<TActionId>,
    ): void {
      // Home uses the button-position path.
    },
    showAtPosition<TActionId extends string>(
      _position: TrailActionMenuPosition,
      request: TrailActionMenuRequest<TActionId>,
    ): void {
      selectTriage = () => {
        const item = request.items.find(({ id }) => id === "triage");
        if (item === undefined) throw new Error("Expected Home Triage creation action");
        return request.onSelect(item.id);
      };
    },
  };

  return {
    presenter,
    selectTriage: () => {
      if (selectTriage === null) throw new Error("Expected Home creation menu request");
      return selectTriage();
    },
  };
}

function readyTriageStore() {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const issue: TrailTriageIssue = {
    context: "triage",
    description: "Review body",
    due: Date.UTC(2026, 8, 3, 4),
    id: "triage-a",
    labelIds: [],
    priority: "high",
    title: "Real Triage row",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
      {
        issues: [issue],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { issue, store };
}

function uiActions(edit = vi.fn()): TrailUiActions {
  return {
    cycles: {
      start: vi.fn(),
    },
    initiatives: {
      create: vi.fn(),
    },
    issues: {
      createFromDraft: vi.fn(),
    },
    projects: {
      createFromDraft: vi.fn(),
    },
    triage: {
      create: vi.fn(),
      defer: vi.fn(),
      delete: vi.fn(),
      edit,
    },
    weeklyNote: {
      archiveCurrent: vi.fn(async () => ({ archives: [], current: "" })),
      load: vi.fn(async () => ({ archives: [], current: "" })),
      replaceCurrent: vi.fn(async (_expectedCurrent: string, current: string) => ({ archives: [], current })),
    },
  } as unknown as TrailUiActions;
}

function expectSharedChassis(
  container: HTMLElement,
  expected: {
    readonly inset: "none" | "page";
    readonly scroll: "nested" | "page";
  },
): void {
  const frame = container.querySelector<HTMLElement>(".trail-workspace-frame");
  const surface = container.querySelector<HTMLElement>(".trail-page-surface");

  expect(frame).not.toBeNull();
  expect(surface).not.toBeNull();
  expect(frame).toContainElement(surface);
  expect(surface).toHaveAttribute("data-inset", expected.inset);
  expect(surface).toHaveAttribute("data-scroll", expected.scroll);
}

describe("TrailApp", () => {
  it("renders the real Home consumer and forwards Work Pulse navigation through the host boundary", () => {
    const navigationStore = createTrailNavigationStore();
    const onNavigate = vi.fn();
    const { container } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailTestRuntimeStore()}
        showDevelopment={false}
      />,
    );

    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "This week" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Work pulse" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Triage" }));
    expect(onNavigate).toHaveBeenCalledWith({ kind: "triage" });
    expect(navigationStore.getState().location).toEqual({ kind: "home" });
    expect(screen.queryByText("This page has not been implemented yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
    expectSharedChassis(container, { inset: "page", scroll: "page" });
  });

  it("preserves UI action owner receivers when Home consumes the shared action surface", async () => {
    const navigationStore = createTrailNavigationStore();
    const baseActions = uiActions();
    const createTriage = vi.fn();
    const triageOwner = {
      ...baseActions.triage,
      ownerMarker: "triage-owner",
      create(input: Parameters<TrailUiActions["triage"]["create"]>[0]) {
        if (this.ownerMarker !== "triage-owner") {
          throw new Error("Triage action receiver was not preserved");
        }
        createTriage(input);
        return mutationReceipt("triage-new");
      },
    };
    const actions = { ...baseActions, triage: triageOwner } as TrailUiActions;
    const actionMenu = homeCreationMenuPresenter();

    render(
      <TrailActionMenuProvider presenter={actionMenu.presenter}>
        <TrailApp
          actions={actions}
          navigationStore={navigationStore}
          onNavigate={vi.fn()}
          renderMarkdown={renderMarkdown}
          runtimeStore={createTrailTestRuntimeStore()}
          showDevelopment={false}
        />
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    act(() => {
      void actionMenu.selectTriage();
    });

    const dialog = screen.getByRole("dialog", { name: "Triage" });
    fireEvent.change(screen.getByRole("textbox", { name: "Triage title" }), {
      target: { value: "Capture through TrailApp" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTriage).toHaveBeenCalledWith(expect.objectContaining({
      title: "Capture through TrailApp",
    })));
    expect(navigationStore.getState().location).toEqual({ kind: "home" });
  });

  it("mounts Foundation on the same Page Surface only for the explicit development location", () => {
    const navigationStore = createTrailNavigationStore();
    act(() => navigationStore.getState().restore({ kind: "foundation" }));

    const runtimeStore = createTrailRuntimeStore();
    const { container, rerender } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={runtimeStore}
        showDevelopment
      />,
    );

    expect(screen.getByRole("heading", { name: "Foundation lab" })).toBeInTheDocument();
    expectSharedChassis(container, { inset: "none", scroll: "page" });

    rerender(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={runtimeStore}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
    expectSharedChassis(container, { inset: "page", scroll: "page" });
  }, 15_000);

  it("gives Triage its Page-owned identity inside the shared nested-scroll surface", async () => {
    const navigationStore = createTrailNavigationStore();
    const { issue, store: runtimeStore } = readyTriageStore();
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));
    const { container } = render(
      <TrailApp
        actions={uiActions(edit)}
        navigationStore={navigationStore}
        onNavigate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={runtimeStore}
        showDevelopment={false}
      />,
    );

    act(() => {
      navigationStore.getState().restore({ kind: "triage" });
    });

    expect(screen.getByRole("heading", { level: 1, name: "Triage" })).toBeInTheDocument();
    expect(container.querySelector(".trail-location-bar")).not.toBeInTheDocument();
    expect(container.querySelector(".trail-triage-page-frame__title")).toHaveTextContent("Triage");
    expectSharedChassis(container, { inset: "none", scroll: "nested" });

    fireEvent.click(screen.getByRole("button", { name: "Real Triage row" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Edited through TrailApp" } });
    fireEvent.blur(title);

    await waitFor(() => expect(edit).toHaveBeenCalledTimes(1));
    expect(edit).toHaveBeenCalledWith(issue, expect.objectContaining({
      title: "Edited through TrailApp",
    }));
    expect(screen.queryByRole("heading", { name: "Foundation lab" })).not.toBeInTheDocument();
  });

  it("emits host navigation intent from Projects Root without mutating location directly", () => {
    const navigationStore = createTrailNavigationStore({ kind: "projects" });
    const runtimeStore = createTrailTestRuntimeStore();
    const onNavigate = vi.fn();
    const { container } = render(
      <TrailApp
        actions={uiActions()}
        navigationStore={navigationStore}
        onNavigate={onNavigate}
        renderMarkdown={renderMarkdown}
        runtimeStore={runtimeStore}
        showDevelopment={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project A" })).toBeInTheDocument();
    expectSharedChassis(container, { inset: "none", scroll: "nested" });

    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    expect(onNavigate).toHaveBeenCalledWith({
      kind: "project",
      projectId: "project-a",
    });
    expect(navigationStore.getState().location).toEqual({ kind: "projects" });
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  });
});
