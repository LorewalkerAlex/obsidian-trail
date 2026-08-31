import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailCollectionRow } from "./trail-collection-row";

describe("TrailCollectionRow", () => {
  it("keeps selection presentation separate from semantic leading content", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <TrailCollectionRow
        data-testid="row"
        highlighted
        leading={<span data-testid="leading">Status</span>}
        ref={ref}
        selected
        selectionControl={<TrailCheckbox label="Select item" />}
      >
        <span>Item title</span>
      </TrailCollectionRow>,
    );

    const row = screen.getByTestId("row");
    const checkbox = screen.getByRole("checkbox", { name: "Select item" });

    expect(row).toHaveClass("trail-collection-row");
    expect(row).toHaveAttribute("data-highlighted", "true");
    expect(row).toHaveAttribute("data-selectable", "true");
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("aria-selected");
    expect(row.children[0]).toHaveClass("trail-collection-row__selection");
    expect(row.children[1]).toHaveClass("trail-collection-row__leading");
    expect(row.children[2]).toHaveClass("trail-collection-row__content");
    expect(screen.getByTestId("leading")).toBeInTheDocument();
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText("Item title")).toBeInTheDocument();
    expect(ref.current).toBe(row);
  });

  it("keeps explicit selection control activation separate from ordinary row activation", () => {
    const onRowClick = vi.fn();
    const onRowKeyDown = vi.fn();
    const onSelectionChange = vi.fn();

    render(
      <TrailCollectionRow
        data-testid="row"
        leading={<span>Priority</span>}
        onClick={onRowClick}
        onKeyDown={onRowKeyDown}
        selectionControl={(
          <TrailCheckbox
            label="Select item"
            onChange={onSelectionChange}
          />
        )}
      >
        <span>Item title</span>
      </TrailCollectionRow>,
    );

    const row = screen.getByTestId("row");
    const checkbox = screen.getByRole("checkbox", { name: "Select item" });

    fireEvent.click(checkbox);
    expect(onSelectionChange).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.keyDown(checkbox, { key: " " });
    expect(onRowKeyDown).not.toHaveBeenCalled();

    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledOnce();

    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowKeyDown).toHaveBeenCalledOnce();
  });

  it("omits unused presentation slots instead of inventing row semantics", () => {
    render(
      <TrailCollectionRow data-testid="row">
        <span>Item title</span>
      </TrailCollectionRow>,
    );

    const row = screen.getByTestId("row");

    expect(row).not.toHaveAttribute("data-selectable");
    expect(row.querySelector(".trail-collection-row__selection")).toBeNull();
    expect(row.querySelector(".trail-collection-row__leading")).toBeNull();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Item title")).toBeInTheDocument();
  });
});
