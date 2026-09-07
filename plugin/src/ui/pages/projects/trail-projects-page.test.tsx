import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  TrailInitiative,
  TrailProject,
  TrailWorkflowIssue,
} from "../../../domain/model/trail-entities";
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
import { TrailProjectsPage } from "./trail-projects-page";

const NOW = Date.UTC(2026, 8, 12, 9);
const DAY_MS = 24 * 60 * 60 * 1000;

function readyProjectsStore() {
  const configuration = createTrailTestConfiguration();
  const initiative: TrailInitiative = {
    id: "initiative-alpha",
    labelIds: [],
    title: "Alpha",
  };
  const activeProject: TrailProject = {
    due: NOW + (20 * DAY_MS),
    id: "project-active",
    initiativeId: initiative.id,
    labelIds: [],
    priority: "high",
    statusDefinitionId: "project-started",
    title: "Build the Projects workspace",
  };
  const unassignedProject: TrailProject = {
    id: "project-unassigned",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Unassigned planning project",
  };
  const completedProject: TrailProject = {
    id: "project-completed",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-completed",
    title: "Completed project",
  };
  const activeIssue: TrailWorkflowIssue = {
    context: "workflow",
    createdAt: NOW - (30 * DAY_MS),
    due: NOW + (5 * DAY_MS),
    firstStartedAt: NOW - (12 * DAY_MS),
    id: "issue-active",
    labelIds: [],
    projectId: activeProject.id,
    statusDefinitionId: "issue-started",
    title: "Active timeline evidence",
  };
  const store = createTrailRuntimeStore();

  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration,
      workspaceState: createTrailTestWorkspaceState(activeProject.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Alpha.md",
      },
      {
        issues: [activeIssue],
        kind: "project",
        milestones: [],
        project: activeProject,
        sourcePath: "Trail/Projects/0001 Build the Projects workspace.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: unassignedProject,
        sourcePath: "Trail/Projects/0002 Unassigned planning project.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project: completedProject,
        sourcePath: "Trail/Projects/0003 Completed project.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return store;
}

function renderProjectsPage() {
  const createFromDraft = vi.fn(() => ({
    commandId: "command-create-project",
    completion: Promise.resolve(),
    entityId: "project-created",
  }));
  const onInitiativeActivate = vi.fn();
  const onProjectActivate = vi.fn();
  const runtimeStore = readyProjectsStore();

  render(
    <TrailProjectsPage
      actions={{ createFromDraft }}
      onInitiativeActivate={onInitiativeActivate}
      onProjectActivate={onProjectActivate}
      runtimeStore={runtimeStore}
    />,
  );

  return {
    createFromDraft,
    onInitiativeActivate,
    onProjectActivate,
    runtimeStore,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TrailProjectsPage", () => {
  it("composes the default Project-first List with Initiative grouping and explicit navigation", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const { onInitiativeActivate, onProjectActivate } = renderProjectsPage();

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Projects view controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Completed project")).not.toBeInTheDocument();

    const alphaGroup = screen.getByRole("region", { name: "Alpha projects" });
    expect(within(alphaGroup).getByText("Build the Projects workspace")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "No Initiative projects" }))
      .toHaveTextContent("Unassigned planning project");

    fireEvent.click(within(alphaGroup).getByRole("button", { name: "Alpha" }));
    expect(onInitiativeActivate).toHaveBeenCalledWith("initiative-alpha");

    fireEvent.click(within(alphaGroup).getByRole("button", { name: "Build the Projects workspace" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-active");

    fireEvent.click(within(alphaGroup).getByRole("button", { name: "Collapse Alpha" }));
    expect(within(alphaGroup).queryByText("Build the Projects workspace")).not.toBeInTheDocument();
  });

  it("uses the shared Filter state for filtered-empty recovery instead of a second collection model", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "Urgent" }));

    const page = screen.getByRole("region", { name: "Projects" });
    expect(within(page).getByText("No projects match the filters.")).toBeInTheDocument();
    fireEvent.click(within(page).getByRole("button", { name: "Clear filters" }));
    expect(within(page).getByText("Build the Projects workspace")).toBeInTheDocument();
  });

  it("switches the same filtered collection to the Query-backed Timeline projection", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const { onProjectActivate } = renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));

    expect(screen.getByRole("button", { name: "Timeline" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: /Projects timeline,/ })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Build the Projects workspace, started" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Unassigned planning project")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Build the Projects workspace" }));
    expect(onProjectActivate).toHaveBeenCalledWith("project-active");
  });

  it("opens the standard Project Composer and submits the full draft use case", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const { createFromDraft } = renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Add project" }));
    const dialog = screen.getByRole("dialog", { name: "Project" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Project title" }), {
      target: { value: "New portfolio project" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createFromDraft).toHaveBeenCalledTimes(1));
    expect(createFromDraft).toHaveBeenCalledWith({
      description: "",
      due: undefined,
      initiativeId: undefined,
      labelIds: [],
      priority: undefined,
      title: "New portfolio project",
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Project" }))
      .not.toBeInTheDocument());
  });
});
