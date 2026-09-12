import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrailCollectionFilter } from "./trail-collection-filter";

describe("TrailCollectionFilter", () => {
  it("can lift its shared popover above a modal without changing ordinary filter mechanics", () => {
    render(
      <TrailCollectionFilter
        layer="modal-child"
        onClearAll={vi.fn()}
        onClearClause={vi.fn()}
        onSetDueValue={vi.fn()}
        onToggleDiscreteValue={vi.fn()}
        properties={[{
          id: "status",
          kind: "discrete",
          label: "Status",
          options: [{ label: "Todo", value: { kind: "value", value: "todo" } }],
        }]}
        state={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("dialog", { name: "Filter" })).toHaveAttribute(
      "data-trail-transient-layer",
      "modal-child",
    );
  });
});
