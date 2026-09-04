import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createTrailInspectorStore } from "./trail-inspector-state";
import { TrailInspector } from "./trail-inspector";

describe("TrailInspector", () => {
  it("renders no product content without a stable target", () => {
    const store = createTrailInspectorStore();

    render(<TrailInspector inspectorStore={store} />);

    expect(screen.queryByRole("complementary", { name: "Trail inspector" })).not.toBeInTheDocument();
  });

  it("renders only the carrier placeholder for the current target kind", () => {
    const store = createTrailInspectorStore();
    store.getState().restore({ kind: "project", projectId: "project-a" });

    render(<TrailInspector inspectorStore={store} />);

    const inspector = screen.getByRole("complementary", { name: "Trail inspector" });
    expect(inspector).toHaveAttribute("data-target-kind", "project");
    expect(screen.getByRole("heading", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByText("Inspector content has not been implemented yet.")).toBeInTheDocument();
  });
});
