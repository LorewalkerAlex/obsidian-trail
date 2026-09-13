import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import {
  TrailInitiativeComposer,
  TrailProjectComposer,
  TrailTriageComposer,
  TrailWorkflowIssueComposer,
  type TrailIssueCreationProjectTarget,
} from "./trail-standard-creation-composers";

const projects: readonly TrailIssueCreationProjectTarget[] = [
  {
    id: "project-a",
    milestones: [{ id: "milestone-a", title: "Milestone A" }],
    title: "Project A",
  },
  {
    id: "project-b",
    milestones: [{ id: "milestone-b", title: "Milestone B" }],
    title: "Project B",
  },
];

const referenceTimestamp = Date.parse("2026-09-05T04:00:00.000Z");

describe("standard creation Composers", () => {
  it("requires an explicit Project when Issue creation has no legal default", async () => {
    const onCreate = vi.fn(async () => undefined);
    const onOpenChange = vi.fn();

    render(
      <TrailWorkflowIssueComposer
        configuration={createTrailTestConfiguration()}
        onCreate={onCreate}
        onOpenChange={onOpenChange}
        open
        projects={projects}
        referenceTimestamp={referenceTimestamp}
        seedDescription="Source body"
        seedTitle="Source title"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Issue · Choose project" })).toBeInTheDocument();
    const project = screen.getByRole("button", { name: "Project: Choose project" });
    await waitFor(() => expect(project).toHaveFocus());
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    fireEvent.click(project);
    expect(screen.getByRole("dialog", { name: "Project" }))
      .toHaveAttribute("data-trail-transient-layer", "modal-child");
    fireEvent.click(screen.getByRole("button", { name: "Project A" }));
    expect(screen.getByRole("dialog", { name: "Issue · Project A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith({
      description: "Source body",
      due: undefined,
      estimate: undefined,
      labelIds: [],
      milestoneId: undefined,
      priority: undefined,
      projectId: "project-a",
      title: "Source title",
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("clears an illegal Milestone when the Issue Project relationship changes", async () => {
    render(
      <TrailWorkflowIssueComposer
        configuration={createTrailTestConfiguration()}
        initialProjectId="project-a"
        onCreate={vi.fn(async () => undefined)}
        onOpenChange={vi.fn()}
        open
        projects={projects}
        referenceTimestamp={referenceTimestamp}
        seedTitle="Seeded"
      />,
    );

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Issue title" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Milestone: No milestone" }));
    fireEvent.click(screen.getByRole("button", { name: "Milestone A" }));
    expect(screen.getByRole("button", { name: "Milestone: Milestone A" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project: Project A" }));
    fireEvent.click(screen.getByRole("button", { name: "Project B" }));
    expect(screen.getByRole("button", { name: "Milestone: No milestone" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Priority: No priority" }));
    const priorityPicker = document.querySelector(".trail-priority-select");
    expect(priorityPicker).toHaveAttribute("data-trail-transient-layer", "modal-child");
  });

  it("keeps a Project draft open and intact when destination creation fails", async () => {
    const onCreate = vi.fn(async () => {
      throw new Error("write failed");
    });

    render(
      <TrailProjectComposer
        configuration={createTrailTestConfiguration()}
        initiatives={[{ id: "initiative-a", title: "Initiative A" }]}
        onCreate={onCreate}
        onOpenChange={vi.fn()}
        open
        referenceTimestamp={referenceTimestamp}
        seedDescription="Source body"
        seedTitle="Source title"
      />,
    );

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Project title" })).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Initiative: No initiative" }));
    fireEvent.click(screen.getByRole("button", { name: "Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Create failed: write failed");
    expect(screen.getByRole("textbox", { name: "Project title" })).toHaveValue("Source title");
    expect(screen.getByRole("textbox", { name: "Project description" })).toHaveValue("Source body");
    expect(screen.getByRole("button", { name: "Initiative: Initiative A" })).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      description: "Source body",
      initiativeId: "initiative-a",
      labelIds: [],
      title: "Source title",
    }));
  });

  it("submits the Triage variant through the shared creation callback contract", async () => {
    const onCreate = vi.fn(async () => undefined);
    const onOpenChange = vi.fn();
    const defaultDue = Date.parse("2026-09-12T15:59:59.999Z");

    render(
      <TrailTriageComposer
        configuration={createTrailTestConfiguration()}
        defaultDue={defaultDue}
        onCreate={onCreate}
        onOpenChange={onOpenChange}
        open
      />,
    );

    const title = screen.getByRole("textbox", { name: "Triage title" });
    await waitFor(() => expect(title).toHaveFocus());
    fireEvent.change(title, { target: { value: "Review onboarding idea" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Triage description" }), {
      target: { value: "Captured context" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      description: "Captured context",
      due: defaultDue,
      labelIds: [],
      priority: undefined,
      title: "Review onboarding idea",
    }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps Initiative creation title-first and delegates the semantic create", async () => {
    const onCreate = vi.fn(async () => undefined);
    const onOpenChange = vi.fn();

    render(
      <TrailInitiativeComposer
        onCreate={onCreate}
        onOpenChange={onOpenChange}
        open
      />,
    );

    const title = screen.getByRole("textbox", { name: "Initiative title" });
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();

    fireEvent.change(title, { target: { value: "Improve Trail onboarding" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Improve Trail onboarding"));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
