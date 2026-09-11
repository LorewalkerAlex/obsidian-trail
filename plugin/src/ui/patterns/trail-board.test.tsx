import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrailBoard, TrailBoardColumn } from "./trail-board";

describe("TrailBoard", () => {
  it("keeps zero-count columns as persistent spatial regions", () => {
    render(
      <TrailBoard label="Issue board">
        <TrailBoardColumn count={0} label="Todo" />
        <TrailBoardColumn count={2} label="In Progress">
          <div>Issue A</div>
          <div>Issue B</div>
        </TrailBoardColumn>
      </TrailBoard>,
    );

    const board = screen.getByRole("region", { name: "Issue board" });
    const todo = within(board).getByRole("region", { name: "Todo issues" });
    const started = within(board).getByRole("region", { name: "In Progress issues" });
    expect(todo).toHaveTextContent("Todo0");
    expect(started).toHaveTextContent("In Progress2");
    expect(started).toHaveTextContent("Issue A");
  });
});
