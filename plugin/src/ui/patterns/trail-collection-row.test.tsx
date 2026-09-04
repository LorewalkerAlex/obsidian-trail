import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { TrailCheckbox } from "../primitives/trail-checkbox";
import { TrailCollectionRow } from "./trail-collection-row";
import { TrailPropertyControl } from "./trail-property-control";

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

  it("keeps inline property and explicit action targets out of ordinary row activation", () => {
    const onRowClick = vi.fn();
    const onRowKeyDown = vi.fn();
    const onPropertyClick = vi.fn();
    const onActionClick = vi.fn();

    render(
      <TrailCollectionRow
        data-testid="row"
        onClick={onRowClick}
        onKeyDown={onRowKeyDown}
      >
        <span>Issue title</span>
        <TrailPropertyControl onClick={onPropertyClick}>In progress</TrailPropertyControl>
        <button onClick={onActionClick} type="button">More</button>
      </TrailCollectionRow>,
    );

    const property = screen.getByRole("button", { name: "In progress" });
    const action = screen.getByRole("button", { name: "More" });

    fireEvent.click(property);
    fireEvent.keyDown(property, { key: "Enter" });
    expect(onPropertyClick).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();
    expect(onRowKeyDown).not.toHaveBeenCalled();

    fireEvent.click(action);
    expect(onActionClick).toHaveBeenCalledOnce();
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Issue title"));
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it("does not mistake a focusable row itself for a nested interactive target", () => {
    const onRowClick = vi.fn();
    const onRowKeyDown = vi.fn();

    render(
      <TrailCollectionRow
        data-testid="row"
        onClick={onRowClick}
        onKeyDown={onRowKeyDown}
        role="button"
        tabIndex={0}
      >
        <span>Focusable row title</span>
      </TrailCollectionRow>,
    );

    const row = screen.getByRole("button", { name: "Focusable row title" });
    fireEvent.click(screen.getByText("Focusable row title"));
    fireEvent.keyDown(row, { key: "Enter" });

    expect(onRowClick).toHaveBeenCalledOnce();
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
