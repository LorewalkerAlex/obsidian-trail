import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
import { TrailInitiativeInspector } from "./trail-initiative-inspector";

function initiativeStore() {
  const initiative: TrailInitiative = {
    description: "This narrative belongs in Main View only.",
    due: Date.parse("2026-09-18T04:00:00.000Z"),
    id: "initiative-a",
    labelIds: ["label-work"],
    priority: "high",
    title: "Initiative Alpha",
  };
  const project: TrailProject = {
    id: "project-a",
    initiativeId: initiative.id,
    labelIds: [],
    statusDefinitionId: "project-unstarted",
    title: "Project A",
  };
  const store = createTrailRuntimeStore();
  publishTrailCommittedRuntime(store, buildTrailCommittedRuntimeCandidate({
    pluginData: {
      configuration: createTrailTestConfiguration(),
      workspaceState: createTrailTestWorkspaceState(project.id),
    },
    sources: [
      {
        initiative,
        kind: "initiative",
        sourcePath: "Trail/Initiatives/0001 Initiative Alpha.md",
      },
      {
        issues: [],
        kind: "project",
        milestones: [],
        project,
        sourcePath: "Trail/Projects/0001 Project A.md",
      },
    ],
  }), { sourceIssuesByPath: {} });
  setTrailRuntimeControl(store, { kind: "ready" });
  return { initiative, store };
}

describe("TrailInitiativeInspector", () => {
  it("shows stable Initiative properties without duplicating Main View narrative", () => {
    const { store } = initiativeStore();
    const editProperties = vi.fn(() => ({
      entityId: "initiative-a",
      kind: "unchanged" as const,
    }));
    render(
      <TrailInitiativeInspector
        actions={{ editProperties }}
        initiativeId="initiative-a"
        runtimeStore={store}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Initiative Alpha" }))
      .toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Initiative properties" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority: High" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Labels: Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Due: Set" })).toBeInTheDocument();
    expect(screen.queryByText("This narrative belongs in Main View only.")).not.toBeInTheDocument();
  });

  it("edits through the Initiative Application intent while preserving untouched properties", () => {
    const { initiative, store } = initiativeStore();
    const editProperties = vi.fn(() => ({
      entityId: initiative.id,
      kind: "unchanged" as const,
    }));
    render(
      <TrailInitiativeInspector
        actions={{ editProperties }}
        initiativeId={initiative.id}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Due: Set" }));
    fireEvent.click(screen.getByRole("button", { name: "No due" }));

    expect(editProperties).toHaveBeenCalledWith(initiative, {
      description: initiative.description,
      due: undefined,
      labelIds: initiative.labelIds,
      priority: initiative.priority,
      title: initiative.title,
    });
  });
});
