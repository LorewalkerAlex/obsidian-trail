import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailFoundationLab } from "./trail-foundation-lab";

describe("TrailFoundationLab pattern ownership", () => {
  it("shelves shared collection patterns under Patterns while semantic Project rows stay under Semantic Entities", () => {
    render(<TrailFoundationLab control={{ kind: "ready" }} revision={7} />);

    const patterns = within(screen.getByRole("region", { name: "Patterns" }));
    expect(patterns.getByRole("group", { name: "Group header" })).toBeInTheDocument();
    expect(patterns.getByRole("group", { name: "Empty state" })).toBeInTheDocument();

    const semanticEntities = within(screen.getByRole("region", { name: "Semantic Entities" }));
    expect(semanticEntities.queryByRole("group", { name: "Group header" })).not.toBeInTheDocument();
    expect(semanticEntities.queryByRole("group", { name: "Empty state" })).not.toBeInTheDocument();
    expect(semanticEntities.getByRole("group", { name: "Project summary rows" }))
      .toBeInTheDocument();
  }, 15_000);
});
