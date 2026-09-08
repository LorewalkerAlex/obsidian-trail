import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailRelationPropertySelect } from "./trail-relation-property-select";

describe("TrailRelationPropertySelect", () => {
  it("presents the current relation and emits an explicit optional target", () => {
    const onValueChange = vi.fn();
    render(
      <TrailRelationPropertySelect
        label="Initiative"
        noneLabel="No initiative"
        onValueChange={onValueChange}
        options={[
          { id: "initiative-a", title: "Initiative A" },
          { id: "initiative-b", title: "Initiative B" },
        ]}
        value="initiative-a"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Initiative: Initiative A" }));
    fireEvent.click(screen.getByRole("button", { name: "Initiative B" }));
    expect(onValueChange).toHaveBeenCalledWith("initiative-b");
  });
});
