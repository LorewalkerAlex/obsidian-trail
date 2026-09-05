import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  TrailProject,
  TrailTriageIssue,
} from "../../../domain/model/trail-entities";
import {
  buildTrailCommittedRuntimeCandidate,
  publishTrailCommittedRuntime,
} from "../../../runtime/reconcile/trail-runtime-reconciler";
import {
  createTrailRuntimeStore,
  setTrailRuntimeControl,
  type TrailRuntimeStore,
} from "../../../runtime/store/trail-runtime-store";
import {
  createTrailTestConfiguration,
  createTrailTestWorkspaceState,
} from "../../../test/trail-test-fixtures";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailTriagePage } from "./trail-triage-page";

type TriagePageActions = Pick<TrailUiActions["triage"], "defer" | "delete" | "edit">;

function triageIssue({
  description,
  due,
  id,
  labelIds = [],
  priority,
  title = id,
}: {
  readonly description?: string;
  readonly due: number;
  readonly id: string;
  readonly labelIds?: readonly string[];
  readonly priority?: TrailTriageIssue["priority"];
  readonly title?: string;
}): TrailTriageIssue {
  return {
    context: "triage",
    description,
    due,
    id,
    labelIds,
    priority,
    title,
  };
}

function createTriageHarness(issues: readonly TrailTriageIssue[]): {
  readonly publish: (nextIssues: readonly TrailTriageIssue[]) => void;
  readonly store: TrailRuntimeStore;
} {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const store = createTrailRuntimeStore();
  const publish = (nextIssues: readonly TrailTriageIssue[]) => publishTrailCommittedRuntime(
    store,
    buildTrailCommittedRuntimeCandidate({
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
          issues: nextIssues,
          kind: "triage",
          sourcePath: "Trail/Collections/Triage.md",
        },
      ],
    }),
    { sourceIssuesByPath: {} },
  );

  publish(issues);
  setTrailRuntimeControl(store, { kind: "ready" });
  return { publish, store };
}

function readyTriageStore(issues: readonly TrailTriageIssue[]): TrailRuntimeStore {
  return createTriageHarness(issues).store;
}

function triageActions(overrides: Partial<TriagePageActions> = {}): TriagePageActions {
  return {
    defer: vi.fn((issue: TrailTriageIssue) => ({
      commandId: "command-defer",
      completion: Promise.resolve(),
      entityId: issue.id,
    })),
    delete: vi.fn((issue: TrailTriageIssue) => ({
      commandId: "command-delete",
      completion: Promise.resolve(),
      entityId: issue.id,
    })),
    edit: vi.fn((issue: TrailTriageIssue) => ({
      entityId: issue.id,
      kind: "unchanged" as const,
    })),
    ...overrides,
  };
}

function deferredCompletion(): {
  readonly promise: Promise<void>;
  readonly reject: (error: Error) => void;
  readonly resolve: () => void;
} {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TrailTriagePage", () => {
  it("renders the effective Query queue with shared View Bar, Label, Due, and Review Set presentation", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({
        due: due(2),
        id: "triage-high",
        labelIds: ["label-work"],
        priority: "high",
        title: "High same due",
      }),
      triageIssue({ due: due(2), id: "triage-urgent", priority: "urgent", title: "Urgent same due" }),
      ...Array.from({ length: 10 }, (_, index) => triageIssue({
        due: due(index + 3),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );

    expect(screen.getByRole("region", { name: "Triage queue" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Triage view controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Order: Review due" })).toBeInTheDocument();
    expect(screen.getByText("10 to review")).toBeInTheDocument();
    const titles = Array.from(container.querySelectorAll(".trail-triage-row__title"))
      .map((element) => element.textContent);
    expect(titles.slice(0, 2)).toEqual(["Urgent same due", "High same due"]);
    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(12);
    expect(container.querySelectorAll("time.trail-due-date")).toHaveLength(12);
    expect(screen.getByRole("img", { name: "Labels: Work" })).toBeInTheDocument();
    const boundary = container.querySelector("[data-review-boundary='true']");
    expect(boundary).not.toBeNull();
    expect(boundary?.previousElementSibling).toHaveTextContent("triage-07");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /accept|defer|delete/i })).not.toBeInTheDocument();
  });

  it("opens the production Review Surface and routes explicit field commits through the UI action boundary", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      description: "Original body",
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-review",
      labelIds: ["label-work"],
      priority: "high",
      title: "Review me",
    });
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));
    const actions = triageActions({ edit });

    render(<TrailTriagePage actions={actions} runtimeStore={readyTriageStore([issue])} />);
    fireEvent.click(screen.getByRole("button", { name: "Review me" }));

    expect(screen.getByRole("region", { name: "Triage review" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Original body")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority: High" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels: Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review due" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Edited title" } });
    fireEvent.blur(title);

    await waitFor(() => expect(edit).toHaveBeenCalledTimes(1));
    expect(edit).toHaveBeenCalledWith(issue, {
      description: "Original body",
      due: issue.due,
      labelIds: ["label-work"],
      priority: "high",
      title: "Edited title",
    });
  });

  it("discards an uncommitted title draft when Next changes Review identity", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const edit = vi.fn((issue: TrailTriageIssue) => ({
      entityId: issue.id,
      kind: "unchanged" as const,
    }));
    const store = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-a", title: "Entry A" }),
      triageIssue({ due: due(3), id: "triage-b", title: "Entry B" }),
    ]);

    render(<TrailTriagePage actions={triageActions({ edit })} runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Entry A" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    const next = screen.getByRole("button", { name: "Next Triage entry" });
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "Unsaved A" } });
    fireEvent.blur(title, { relatedTarget: next });
    fireEvent.click(next);

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry B");
    });
    expect(edit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Previous Triage entry" }));
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry A");
    });
  });

  it("uses Back as an explicit Review exit without saving an uncommitted draft", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-back",
      title: "Back target",
    });
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));

    render(
      <TrailTriagePage
        actions={triageActions({ edit })}
        runtimeStore={readyTriageStore([issue])}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back target" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    const back = screen.getByRole("button", { name: "Back to Triage queue" });
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "Discard me" } });
    fireEvent.blur(title, { relatedTarget: back });
    fireEvent.click(back);

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Triage review" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Back target" })).toBeInTheDocument();
    expect(edit).not.toHaveBeenCalled();
  });

  it("does not save a text draft when focus leaves the Triage Page", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-leave",
      title: "Leave target",
    });
    const edit = vi.fn((expectedIssue: TrailTriageIssue) => ({
      entityId: expectedIssue.id,
      kind: "unchanged" as const,
    }));
    const { unmount } = render(
      <TrailTriagePage
        actions={triageActions({ edit })}
        runtimeStore={readyTriageStore([issue])}
      />,
    );
    const outside = document.createElement("button");
    document.body.append(outside);

    fireEvent.click(screen.getByRole("button", { name: "Leave target" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.focus(title);
    fireEvent.change(title, { target: { value: "Transient only" } });
    fireEvent.blur(title, { relatedTarget: outside });
    unmount();

    expect(edit).not.toHaveBeenCalled();
    outside.remove();
  });

  it("keeps needs-input feedback local for an explicit field commit", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const actions = triageActions({
      edit: vi.fn(() => ({
        input: { code: "more-input", message: "More input is required." },
        kind: "needs-input" as const,
      })),
    });
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-needs-input",
      title: "Needs input",
    });

    render(<TrailTriagePage actions={actions} runtimeStore={readyTriageStore([issue])} />);
    fireEvent.click(screen.getByRole("button", { name: "Needs input" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Unsaved title" } });
    fireEvent.blur(title);

    expect(await screen.findByRole("alert")).toHaveTextContent("More input is required.");
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Unsaved title");
  });

  it("keeps an edit draft visible when submitted persistence fails and Runtime has recovered", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-edit-failure",
      title: "Original title",
    });
    const completion = deferredCompletion();
    const actions = triageActions({
      edit: vi.fn(() => ({
        kind: "submitted" as const,
        receipt: {
          commandId: "command-edit",
          completion: completion.promise,
          entityId: issue.id,
        },
      })),
    });

    render(<TrailTriagePage actions={actions} runtimeStore={readyTriageStore([issue])} />);
    fireEvent.click(screen.getByRole("button", { name: "Original title" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Attempted title" } });
    fireEvent.blur(title);

    expect(await screen.findByText("Saving...")).toBeInTheDocument();
    await act(async () => {
      completion.reject(new Error("write failed"));
      try {
        await completion.promise;
      } catch {
        // Runtime recovery completes before the receipt rejects.
      }
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Save failed: write failed");
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Attempted title");
    expect(screen.getByRole("button", { name: "Defer Triage entry" })).toBeEnabled();
  });

  it("keeps editing available while one save settles and serializes an explicitly recommitted draft", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-edit-queue",
      title: "Original title",
    });
    const harness = createTriageHarness([issue]);
    const firstCompletion = deferredCompletion();
    const secondCompletion = deferredCompletion();
    const edit = vi.fn()
      .mockImplementationOnce(() => ({
        kind: "submitted" as const,
        receipt: {
          commandId: "command-edit-1",
          completion: firstCompletion.promise,
          entityId: issue.id,
        },
      }))
      .mockImplementationOnce(() => ({
        kind: "submitted" as const,
        receipt: {
          commandId: "command-edit-2",
          completion: secondCompletion.promise,
          entityId: issue.id,
        },
      }));

    render(
      <TrailTriagePage
        actions={triageActions({ edit })}
        runtimeStore={harness.store}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Original title" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "First title" } });
    fireEvent.blur(title);

    expect(await screen.findByText("Saving...")).toBeInTheDocument();
    expect(title).toBeEnabled();
    expect(screen.getByRole("button", { name: "Defer Triage entry" })).toBeEnabled();

    fireEvent.change(title, { target: { value: "Second title" } });
    fireEvent.blur(title);
    const firstSaved = { ...issue, title: "First title" };
    act(() => {
      harness.publish([firstSaved]);
    });
    await act(async () => {
      firstCompletion.resolve();
      await firstCompletion.promise;
    });

    await waitFor(() => expect(edit).toHaveBeenCalledTimes(2));
    expect(edit).toHaveBeenNthCalledWith(2, firstSaved, expect.objectContaining({
      title: "Second title",
    }));
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Second title");

    const secondSaved = { ...issue, title: "Second title" };
    act(() => {
      harness.publish([secondSaved]);
    });
    await act(async () => {
      secondCompletion.resolve();
      await secondCompletion.promise;
    });

    await waitFor(() => {
      expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Second title");
  });

  it("does not auto-save a newer uncommitted draft when navigation waits for an earlier save", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const issueA = triageIssue({ due: due(2), id: "triage-a", title: "Entry A" });
    const issueB = triageIssue({ due: due(3), id: "triage-b", title: "Entry B" });
    const harness = createTriageHarness([issueA, issueB]);
    const completion = deferredCompletion();
    const edit = vi.fn(() => ({
      kind: "submitted" as const,
      receipt: {
        commandId: "command-edit",
        completion: completion.promise,
        entityId: issueA.id,
      },
    }));

    render(
      <TrailTriagePage
        actions={triageActions({ edit })}
        runtimeStore={harness.store}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Entry A" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "First title" } });
    fireEvent.blur(title);
    expect(await screen.findByText("Saving...")).toBeInTheDocument();

    fireEvent.change(title, { target: { value: "Second title" } });
    const next = screen.getByRole("button", { name: "Next Triage entry" });
    fireEvent.blur(title, { relatedTarget: next });
    fireEvent.click(next);
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Second title");

    const firstSaved = { ...issueA, title: "First title" };
    act(() => {
      harness.publish([firstSaved, issueB]);
    });
    await act(async () => {
      completion.resolve();
      await completion.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry B");
    });
    expect(edit).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Previous Triage entry" }));
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("First title");
    });
  });

  it("disables Previous and Next when the active Review identity leaves the visible projection", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-low", priority: "low", title: "Low current" }),
      triageIssue({ due: due(3), id: "triage-high", priority: "high", title: "High visible" }),
    ]);

    render(<TrailTriagePage actions={triageActions()} runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Low current" }));
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    expect(screen.getByText("Not in current view - 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous Triage entry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next Triage entry" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Low current");
  });

  it("waits for authoritative Defer completion and advances from the pre-disposition slot using current Query ordering", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const issueA = triageIssue({ due: due(2), id: "triage-a", title: "Entry A" });
    const issueB = triageIssue({ due: due(3), id: "triage-b", title: "Entry B" });
    const issueC = triageIssue({ due: due(4), id: "triage-c", title: "Entry C" });
    const harness = createTriageHarness([issueA, issueB, issueC]);
    const completion = deferredCompletion();
    const defer = vi.fn((issue: TrailTriageIssue) => ({
      commandId: "command-defer",
      completion: completion.promise,
      entityId: issue.id,
    }));

    render(
      <TrailTriagePage
        actions={triageActions({ defer })}
        runtimeStore={harness.store}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Entry A" }));
    fireEvent.click(screen.getByRole("button", { name: "Defer Triage entry" }));

    expect(await screen.findByText("Deferring...")).toBeInTheDocument();
    const deferredA = { ...issueA, due: due(9) };
    act(() => {
      harness.publish([deferredA, issueB, issueC]);
    });

    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry A");

    await act(async () => {
      completion.resolve();
      await completion.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry B");
    });
    expect(defer).toHaveBeenCalledWith(issueA, due(9));
  });

  it("advances Delete from the removed entry's original slot after authoritative completion", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const issueA = triageIssue({ due: due(2), id: "triage-a", priority: "low", title: "Entry A" });
    const issueB = triageIssue({ due: due(3), id: "triage-b", priority: "urgent", title: "Entry B" });
    const issueC = triageIssue({ due: due(4), id: "triage-c", priority: "high", title: "Entry C" });
    const issueD = triageIssue({ due: due(5), id: "triage-d", priority: "medium", title: "Entry D" });
    const harness = createTriageHarness([issueA, issueB, issueC, issueD]);
    const completion = deferredCompletion();
    const remove = vi.fn((issue: TrailTriageIssue) => ({
      commandId: "command-delete",
      completion: completion.promise,
      entityId: issue.id,
    }));

    render(
      <TrailTriagePage
        actions={triageActions({ delete: remove })}
        runtimeStore={harness.store}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Order: Review due" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "Entry C" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Triage entry" }));

    expect(await screen.findByText("Deleting...")).toBeInTheDocument();
    act(() => {
      harness.publish([issueA, issueB, issueD]);
    });
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry C");

    await act(async () => {
      completion.resolve();
      await completion.promise;
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Entry D");
    });
    expect(remove).toHaveBeenCalledWith(issueC);
  });

  it("keeps the active Review identity after a failed Delete and relies on Runtime recovery", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const issue = triageIssue({
      due: Date.UTC(2026, 8, 2, 4),
      id: "triage-delete",
      title: "Keep on failure",
    });
    const completion = deferredCompletion();
    const actions = triageActions({
      delete: vi.fn(() => ({
        commandId: "command-delete",
        completion: completion.promise,
        entityId: issue.id,
      })),
    });

    render(<TrailTriagePage actions={actions} runtimeStore={readyTriageStore([issue])} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep on failure" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Triage entry" }));
    expect(await screen.findByText("Deleting...")).toBeInTheDocument();

    await act(async () => {
      completion.reject(new Error("persistence failed"));
      try {
        await completion.promise;
      } catch {
        // The Review Surface owns presentation only; Runtime/Source Sync own recovery.
      }
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Delete failed: persistence failed");
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Keep on failure");
  });

  it("applies the shared Filter immediately without redefining the global Review Set boundary", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const due = (day: number) => Date.UTC(2026, 8, day, 4);
    const store = readyTriageStore([
      triageIssue({ due: due(2), id: "triage-high", priority: "high", title: "High match" }),
      triageIssue({ due: due(3), id: "triage-low", priority: "low", title: "Low hidden" }),
      ...Array.from({ length: 10 }, (_, index) => triageIssue({
        due: due(index + 4),
        id: `triage-${String(index).padStart(2, "0")}`,
      })),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(1);
    expect(screen.getByText("High match")).toBeInTheDocument();
    expect(screen.queryByText("Low hidden")).not.toBeInTheDocument();
    expect(screen.getByText("10 to review overall")).toBeInTheDocument();
    expect(container.querySelector("[data-review-boundary='true']")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear priority filter" })).toBeInTheDocument();
  });

  it("exposes the frozen Triage Filter registry and applies Due as a cutoff", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({ due: Date.UTC(2026, 7, 31, 4), id: "triage-overdue", title: "Overdue" }),
      triageIssue({ due: Date.UTC(2026, 8, 1, 15), id: "triage-today", title: "Today cutoff" }),
      triageIssue({ due: Date.UTC(2026, 8, 2, 4), id: "triage-tomorrow", title: "Tomorrow" }),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByRole("button", { name: "Due" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Status" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Due" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(2);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Today cutoff")).toBeInTheDocument();
    expect(screen.queryByText("Tomorrow")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear due filter" })).toBeInTheDocument();
  });

  it("builds the Labels filter from issue-capable configuration definitions", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-work",
        labelIds: ["label-work"],
        title: "Work item",
      }),
      triageIssue({ due: Date.UTC(2026, 8, 3, 4), id: "triage-none", title: "No label item" }),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Labels" }));

    expect(screen.getByRole("searchbox", { name: "Search labels" })).toBeInTheDocument();
    expect(screen.getByText("Area")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Work" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(1);
    expect(screen.getByText("Work item")).toBeInTheDocument();
    expect(screen.queryByText("No label item")).not.toBeInTheDocument();
  });

  it("switches only between the two frozen Triage ordering choices", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-low-earlier",
        priority: "low",
        title: "Low earlier",
      }),
      triageIssue({
        due: Date.UTC(2026, 8, 5, 4),
        id: "triage-urgent-later",
        priority: "urgent",
        title: "Urgent later",
      }),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );
    const titles = () => Array.from(container.querySelectorAll(".trail-triage-row__title"))
      .map((element) => element.textContent);

    expect(titles()).toEqual(["Low earlier", "Urgent later"]);
    fireEvent.click(screen.getByRole("button", { name: "Order: Review due" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));

    expect(screen.getByRole("button", { name: "Order: Priority" })).toBeInTheDocument();
    expect(titles()).toEqual(["Urgent later", "Low earlier"]);
    expect(screen.getByText("2 to review overall")).toBeInTheDocument();
    expect(container.querySelector("[data-review-boundary='true']")).toBeNull();
  });

  it("distinguishes a filtered-empty queue from a genuinely empty collection", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-01T04:00:00.000Z"));
    const store = readyTriageStore([
      triageIssue({
        due: Date.UTC(2026, 8, 2, 4),
        id: "triage-low",
        priority: "low",
        title: "Low only",
      }),
    ]);

    const { container } = render(
      <TrailTriagePage actions={triageActions()} runtimeStore={store} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    fireEvent.click(screen.getByRole("button", { name: "High" }));

    expect(container.querySelectorAll("[data-triage-row]")).toHaveLength(0);
    expect(screen.getByText("No Triage entries match the filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Low only")).toBeInTheDocument();
  });
});
