import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createDefaultTrailPluginData,
  resolveDefaultStatusDefinition,
} from "./domain/trail-configuration";
import type { TrailTriageIssue } from "./domain/trail-issue";
import {
  createTrailRuntimeStore,
  reconcileProjectContribution,
  reconcileTriageContribution,
  setTrailRuntimeAvailability,
  setTrailRuntimeConfiguration,
} from "./domain/trail-runtime";
import { TrailApp } from "./trail-app";

function createReadyStore() {
  let id = 0;
  const configuration = createDefaultTrailPluginData({
    createId: () => `status-${++id}`,
    timezone: "UTC",
  }).configuration;
  const store = createTrailRuntimeStore();
  setTrailRuntimeConfiguration(store, configuration);
  setTrailRuntimeAvailability(store, { kind: "ready", timezone: "UTC" });
  return { configuration, store };
}

describe("Triage Accept UI", () => {
  it("chooses an existing Project and submits the source Issue snapshot", () => {
    const { configuration, store } = createReadyStore();
    const source: TrailTriageIssue = {
      context: "triage",
      due: 5_000,
      id: "triage-a",
      labelIds: [],
      title: "Captured work",
    };
    reconcileTriageContribution(store, {
      filePath: "Trail/Collections/Triage.md",
      issuesById: { [source.id]: source },
      sourceByIssueId: {
        [source.id]: {
          endOffset: 10,
          filePath: "Trail/Collections/Triage.md",
          markerEndOffset: 8,
          markerStartOffset: 4,
          startOffset: 0,
        },
      },
    });
    const project = {
      id: "project-a",
      labelIds: [],
      statusDefinitionId: resolveDefaultStatusDefinition(
        configuration.statuses.project,
        "unstarted",
      ).id,
      title: "Accept Target",
    };
    reconcileProjectContribution(store, {
      filePath: "Trail/Projects/0001 Accept Target.md",
      issuesById: {},
      project,
      sourceByIssueId: {},
    });

    const onAccept = vi.fn(() => ({
      completion: Promise.resolve(),
      sourceIssueId: source.id,
      targetIssueId: "workflow-b",
    }));
    const unused = () => {
      throw new Error("unused action");
    };

    render(
      <TrailApp
        onAccept={onAccept}
        onCapture={unused}
        onCreateProject={unused}
        onCreateWorkflowIssue={unused}
        onDefer={unused}
        onDelete={unused}
        onEdit={unused}
        onWorkflowStatusChange={unused}
        runtimeStore={store}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(screen.getByLabelText("Accept into Project")).toHaveValue(project.id);
    fireEvent.click(screen.getByRole("button", { name: "Accept to Project" }));

    expect(onAccept).toHaveBeenCalledWith(source, project.id);
    expect(screen.queryByRole("button", { name: "Accept to Project" })).toBeNull();
  });
});
