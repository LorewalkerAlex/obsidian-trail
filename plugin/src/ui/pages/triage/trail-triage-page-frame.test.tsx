import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TrailProject } from "../../../domain/model/trail-entities";
import { resolveTrailTriageDefaultDue } from "../../../domain/rules/trail-temporal-rules";
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
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailTriagePageFrame } from "./trail-triage-page-frame";

function readyTriageStore() {
  const configuration = createTrailTestConfiguration();
  const project: TrailProject = {
    id: "project-a",
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
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
        issues: [],
        kind: "triage",
        sourcePath: "Trail/Collections/Triage.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });

  return { configuration, store };
}

function deferredCompletion() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function frameActions(create: TrailUiActions["triage"]["create"]) {
  return {
    acceptFromDraft: vi.fn(),
    convertToProjectFromDraft: vi.fn(),
    create,
    defer: vi.fn(),
    delete: vi.fn(),
    edit: vi.fn(),
  } as unknown as Pick<
    TrailUiActions["triage"],
    "acceptFromDraft" | "convertToProjectFromDraft" | "create" | "defer" | "delete" | "edit"
  >;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TrailTriagePageFrame", () => {
  it("opens the standard Triage Composer from the Page header and submits the displayed default Due", async () => {
    const now = Date.parse("2026-09-05T08:30:00.000Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    const { configuration, store } = readyTriageStore();
    const completion = deferredCompletion();
    const create = vi.fn(() => ({
      commandId: "command-create",
      completion: completion.promise,
      entityId: "triage-created",
    }));

    render(<TrailTriagePageFrame actions={frameActions(create)} runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Triage" }));

    const dialog = screen.getByRole("dialog", { name: "Triage" });
    const composer = within(dialog);
    const title = composer.getByRole("textbox", { name: "Triage title" });
    await waitFor(() => expect(title).toHaveFocus());
    expect(composer.getByRole("button", { name: "Review due" })).toBeInTheDocument();

    fireEvent.change(title, { target: { value: "Review new capture" } });
    fireEvent.change(composer.getByRole("textbox", { name: "Triage description" }), {
      target: { value: "Captured context" },
    });
    fireEvent.click(composer.getByRole("button", { name: "Create" }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      description: "Captured context",
      due: resolveTrailTriageDefaultDue(now, configuration.temporal.timezone),
      labelIds: [],
      priority: undefined,
      title: "Review new capture",
    });
    expect(composer.getByRole("button", { name: "Creating..." })).toBeDisabled();

    await act(async () => {
      completion.resolve();
      await completion.promise;
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Triage" })).not.toBeInTheDocument();
    });
  });

  it("keeps the Triage draft open with local feedback when persistence fails", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-05T08:30:00.000Z"));
    const { store } = readyTriageStore();
    const completion = deferredCompletion();
    const create = vi.fn(() => ({
      commandId: "command-create",
      completion: completion.promise,
      entityId: "triage-created",
    }));

    render(<TrailTriagePageFrame actions={frameActions(create)} runtimeStore={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Triage" }));
    const title = screen.getByRole("textbox", { name: "Triage title" });
    fireEvent.change(title, { target: { value: "Keep after failure" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await act(async () => {
      completion.reject(new Error("write failed"));
      try {
        await completion.promise;
      } catch {
        // The Composer owns local failure presentation and preserves its draft.
      }
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Create failed: write failed");
    expect(screen.getByRole("dialog", { name: "Triage" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Triage title" })).toHaveValue("Keep after failure");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });
});
