import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createTrailTestRuntimeStore } from "../../../test/trail-runtime-test-harness";
import type { TrailUiActions } from "../../shell/trail-ui-actions";
import { TrailProjectInspector } from "./trail-project-inspector";

function unchanged(entityId = "project-a") {
  return { entityId, kind: "unchanged" as const };
}

function actions() {
  const changeInitiative = vi.fn(() => unchanged());
  const changeStatus = vi.fn(() => unchanged());
  const editProperties = vi.fn(() => unchanged());
  const createMilestone = vi.fn(() => ({
    commandId: "command-milestone",
    completion: Promise.resolve(),
    entityId: "milestone-new",
  }));
  const value = {
    milestones: { create: createMilestone },
    projects: {
      changeInitiative,
      changeStatus,
      editProperties,
    },
  } as unknown as {
    readonly milestones: Pick<TrailUiActions["milestones"], "create">;
    readonly projects: Pick<
      TrailUiActions["projects"],
      "changeInitiative" | "changeStatus" | "editProperties"
    >;
  };
  return { changeInitiative, changeStatus, createMilestone, editProperties, value };
}

describe("TrailProjectInspector", () => {
  it("renders structured Project properties and derived zero states without duplicating narrative", () => {
    const { value } = actions();
    render(
      <TrailProjectInspector
        actions={value}
        projectId="project-a"
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Project A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status: unstarted" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Initiative: Initiative A" })).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Project progress" }),
    ).toHaveAttribute("aria-valuetext", "Unavailable");
    expect(screen.getByText("Overdue").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("This week").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("Later").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("No milestones")).toBeInTheDocument();
    expect(screen.queryByText("Project narrative")).not.toBeInTheDocument();
  });

  it("emits Project Status and Initiative changes through Application intents", () => {
    const { changeInitiative, changeStatus, value } = actions();
    render(
      <TrailProjectInspector
        actions={value}
        projectId="project-a"
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Status: unstarted" }));
    fireEvent.click(screen.getByRole("button", { name: "completed" }));
    expect(changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ id: "project-a" }),
      "project-completed",
    );

    fireEvent.click(screen.getByRole("button", { name: "Initiative: Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "No initiative" }));
    expect(changeInitiative).toHaveBeenCalledWith(
      expect.objectContaining({ id: "project-a" }),
      undefined,
    );
  });

  it("creates a Milestone with the owning Project implicit", async () => {
    const { createMilestone, value } = actions();
    render(
      <TrailProjectInspector
        actions={value}
        projectId="project-a"
        runtimeStore={createTrailTestRuntimeStore()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add milestone" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Milestone name" }), {
      target: { value: "Beta checkpoint" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createMilestone).toHaveBeenCalledTimes(1));
    expect(createMilestone).toHaveBeenCalledWith("project-a", "Beta checkpoint", undefined);
  });
});
