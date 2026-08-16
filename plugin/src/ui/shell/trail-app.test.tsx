import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailRuntimeStore } from "../../runtime/store/trail-runtime-store";
import { createReadyTrailUiStore } from "../test/trail-ui-test-fixtures";
import { TrailApp, type TrailAppProps } from "./trail-app";

function unusedActions(): Omit<TrailAppProps, "runtimeStore"> {
  const unused = (): never => {
    throw new Error("action is unused");
  };
  return {
    onCapture: unused,
    onCreateProject: unused,
    onCreateWorkflowIssue: unused,
    onDefer: unused,
    onDelete: unused,
    onEdit: unused,
    onWorkflowStatusChange: unused,
  };
}

describe("TrailApp shell", () => {
  it("shows initialization state before the application is ready", () => {
    render(
      <TrailApp
        {...unusedActions()}
        runtimeStore={createTrailRuntimeStore()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading Trail");
  });

  it("owns page navigation while pages own their product content", () => {
    const store = createReadyTrailUiStore();
    render(<TrailApp {...unusedActions()} runtimeStore={store} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Triage");
    expect(screen.getByText("Quick Capture")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Projects" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Projects");
    expect(screen.getByText("No Projects yet.")).toBeInTheDocument();
  });
});
