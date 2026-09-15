import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTrailRuntimeStore } from "../../../runtime/store/trail-runtime-store";
import { createTrailTestRuntimeStore } from "../../../test/trail-runtime-test-harness";
import type {
  TrailActionMenuPosition,
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../../interactions/trail-action-menu";
import { TrailActionMenuProvider } from "../../interactions/trail-action-menu-context";
import type { TrailMarkdownRender } from "../../patterns/trail-page-narrative";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailHomePage } from "./trail-home-page";

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

function homeActions() {
  const start: TrailUiActions["cycles"]["start"] = () => {
    throw new Error("Cycle start submission is not expected in this test");
  };
  const createInitiative = vi.fn((_title: string) => mutationReceipt("initiative-new"));
  const createIssue = vi.fn((
    _input: Parameters<TrailUiActions["issues"]["createFromDraft"]>[0],
  ) => mutationReceipt("issue-new"));
  const createProject = vi.fn((
    _input: Parameters<TrailUiActions["projects"]["createFromDraft"]>[0],
  ) => mutationReceipt("project-new"));
  const createTriage = vi.fn((
    _input: Parameters<TrailUiActions["triage"]["create"]>[0],
  ) => mutationReceipt("triage-new"));

  return {
    actions: {
      cycles: { start },
      initiatives: { create: createInitiative },
      issues: { createFromDraft: createIssue },
      projects: { createFromDraft: createProject },
      triage: { create: createTriage },
      weeklyNote: {
        archiveCurrent: vi.fn(async () => ({ archives: [], current: "" })),
        load: vi.fn(async () => ({ archives: [], current: "Weekly planning notes" })),
        replaceCurrent: vi.fn(async (_expectedCurrent: string, current: string) => ({ archives: [], current })),
      },
    },
    createInitiative,
    createIssue,
    createProject,
    createTriage,
  };
}

function actionMenuCapture() {
  let items: readonly { readonly id: string; readonly label: string }[] = [];
  let selectAction: ((actionId: string) => void | Promise<void>) | null = null;
  const showAtPosition = vi.fn((_position: TrailActionMenuPosition) => undefined);
  const presenter: TrailActionMenuPresenter = {
    showAtMouseEvent<TActionId extends string>(
      _event: MouseEvent,
      _request: TrailActionMenuRequest<TActionId>,
    ): void {
      // This test captures the button-position path used by Home.
    },
    showAtPosition<TActionId extends string>(
      position: TrailActionMenuPosition,
      request: TrailActionMenuRequest<TActionId>,
    ): void {
      showAtPosition(position);
      items = request.items.map(({ id, label }) => ({ id, label }));
      selectAction = (actionId) => {
        const item = request.items.find(({ id }) => id === actionId);
        if (item === undefined) {
          throw new Error(`Unknown Home creation action: ${actionId}`);
        }
        return request.onSelect(item.id);
      };
    },
  };

  return {
    presenter,
    readItems: () => items,
    select: (actionId: string) => {
      if (selectAction === null) throw new Error("Expected Home creation menu request");
      return selectAction(actionId);
    },
    showAtPosition,
  };
}

describe("TrailHomePage", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 8, 14, 8));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Page identity available before Configuration is readable", () => {
    const { actions } = homeActions();
    render(
      <TrailHomePage
        actions={actions}
        onCycleActivate={vi.fn()}
        onProjectActivate={vi.fn()}
        onProjectsActivate={vi.fn()}
        onTriageActivate={vi.fn()}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "This week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Weekly meeting notes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Work pulse" })).not.toBeInTheDocument();
  });

  it("routes the compact Header creation action into the four standard Composers", async () => {
    const actionMenu = actionMenuCapture();
    const {
      actions,
      createInitiative,
      createIssue,
      createProject,
      createTriage,
    } = homeActions();

    render(
      <TrailActionMenuProvider presenter={actionMenu.presenter}>
        <TrailHomePage
          actions={actions}
          onCycleActivate={vi.fn()}
          onProjectActivate={vi.fn()}
          onProjectsActivate={vi.fn()}
          onTriageActivate={vi.fn()}
          renderMarkdown={renderMarkdown}
          runtimeStore={createTrailTestRuntimeStore()}
        />
      </TrailActionMenuProvider>,
    );

    const create = screen.getByRole("button", { name: "Create" });
    expect(create).toBeEnabled();
    fireEvent.click(create);
    expect(actionMenu.showAtPosition).toHaveBeenCalledTimes(1);

    expect(actionMenu.readItems()).toEqual([
      { id: "triage", label: "Triage" },
      { id: "issue", label: "Issue" },
      { id: "project", label: "Project" },
      { id: "initiative", label: "Initiative" },
    ]);

    act(() => {
      void actionMenu.select("issue");
    });
    const issueDialog = screen.getByRole("dialog", { name: "Issue · Project A" });
    expect(within(issueDialog).getByRole("button", { name: "Project: Project A" }))
      .toBeInTheDocument();
    fireEvent.change(within(issueDialog).getByRole("textbox", { name: "Issue title" }), {
      target: { value: "Issue from Home" },
    });
    fireEvent.click(within(issueDialog).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(createIssue).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-a",
      title: "Issue from Home",
    })));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /^Issue/ })).not.toBeInTheDocument();
    });

    act(() => {
      void actionMenu.select("project");
    });
    const projectDialog = screen.getByRole("dialog", { name: "Project" });
    fireEvent.click(within(projectDialog).getByRole("button", { name: "Initiative: No initiative" }));
    expect(screen.getByRole("button", { name: "Initiative A" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No initiative" }));
    fireEvent.change(within(projectDialog).getByRole("textbox", { name: "Project title" }), {
      target: { value: "Project from Home" },
    });
    fireEvent.click(within(projectDialog).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
      initiativeId: undefined,
      title: "Project from Home",
    })));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Project" })).not.toBeInTheDocument();
    });

    act(() => {
      void actionMenu.select("initiative");
    });
    const initiativeDialog = screen.getByRole("dialog", { name: "Initiative" });
    fireEvent.change(within(initiativeDialog).getByRole("textbox", { name: "Initiative title" }), {
      target: { value: "Initiative from Home" },
    });
    fireEvent.click(within(initiativeDialog).getByRole("button", { name: "Create" }));
    await waitFor(() => expect(createInitiative).toHaveBeenCalledWith("Initiative from Home"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Initiative" })).not.toBeInTheDocument();
    });

    act(() => {
      void actionMenu.select("triage");
    });
    const triageDialog = screen.getByRole("dialog", { name: "Triage" });
    expect(triageDialog).toBeInTheDocument();
    fireEvent.change(within(triageDialog).getByRole("textbox", { name: "Triage title" }), {
      target: { value: "Capture from Home" },
    });
    fireEvent.click(within(triageDialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createTriage).toHaveBeenCalledTimes(1));
    expect(createTriage).toHaveBeenCalledWith(expect.objectContaining({
      title: "Capture from Home",
    }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Triage" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });

  it("consumes temporal, Weekly Notes, and Work Pulse production modules", async () => {
    const onCycleActivate = vi.fn();
    const onProjectsActivate = vi.fn();
    const onTriageActivate = vi.fn();
    const { actions } = homeActions();
    const { container } = render(
      <TrailHomePage
        actions={actions}
        onCycleActivate={onCycleActivate}
        onProjectActivate={vi.fn()}
        onProjectsActivate={onProjectsActivate}
        onTriageActivate={onTriageActivate}
        renderMarkdown={renderMarkdown}
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    const thisWeek = screen.getByRole("region", { name: "This week" });
    const lifecycle = screen.getByRole("region", { name: "Lifecycle activity" });
    const workTrend = screen.getByRole("region", { name: "Work trend" });
    const weeklyNotes = screen.getByRole("region", { name: "Weekly meeting notes" });
    const workPulse = screen.getByRole("region", { name: "Work pulse" });

    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
    expect(thisWeek).toHaveAttribute("data-home-widget-size", "compact");
    expect(lifecycle).toHaveAttribute("data-home-widget-size", "banner");
    expect(workTrend).toHaveAttribute("data-home-widget-size", "wide");
    expect(weeklyNotes).toHaveAttribute("data-home-widget-size", "wide");
    expect(workPulse).toHaveAttribute("data-home-widget-size", "banner");
    expect(within(thisWeek).getByText("Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("Jul\u2013Sep")).toBeInTheDocument();
    expect(within(workTrend).getByText("No workflow history yet")).toBeInTheDocument();
    expect(await within(weeklyNotes).findByText("Weekly planning notes")).toBeInTheDocument();
    expect(within(workPulse).getByText("0 active")).toBeInTheDocument();
    expect(within(workPulse).getByText("None started")).toBeInTheDocument();

    fireEvent.click(within(workPulse).getByRole("button", { name: "Open Triage" }));
    fireEvent.click(within(workPulse).getByRole("button", { name: "Open Projects" }));
    expect(onTriageActivate).toHaveBeenCalledTimes(1);
    expect(onProjectsActivate).toHaveBeenCalledTimes(1);

    fireEvent.click(within(workPulse).getByRole("button", { name: "Start cycle" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start cycle" })).toBeInTheDocument();
    expect(onCycleActivate).not.toHaveBeenCalled();

    const slots = Array.from(container.querySelectorAll<HTMLElement>(".trail-home-page__slot"))
      .map((slot) => slot.dataset.homeSlot);
    expect(slots).toEqual([
      "this-week",
      "work-pulse",
      "lifecycle",
      "work-trend",
      "weekly-notes",
    ]);
  });
});
