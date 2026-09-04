import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TrailViewBar,
  TrailViewBarAction,
  TrailViewLayoutSwitch,
} from "./trail-view-bar";

function TestIcon({ name }: { readonly name: string }) {
  return <span data-testid={name} />;
}

describe("TrailViewBar", () => {
  it("composes page-supplied leading and trailing controls without a required Display slot", () => {
    const onValueChange = vi.fn();

    render(
      <TrailViewBar
        label="Project workspace view controls"
        leading={(
          <TrailViewBarAction icon={<TestIcon name="filter-icon" />} label="Filter" />
        )}
        trailing={(
          <TrailViewLayoutSwitch
            label="Project layout"
            onValueChange={onValueChange}
            options={[
              {
                icon: <TestIcon name="list-icon" />,
                label: "List layout",
                value: "list",
              },
              {
                icon: <TestIcon name="board-icon" />,
                label: "Board layout",
                value: "board",
              },
            ]}
            value="list"
          />
        )}
      />,
    );

    const viewBar = screen.getByRole("group", {
      name: "Project workspace view controls",
    });
    const controls = within(viewBar);
    const filter = controls.getByRole("button", { name: "Filter" });
    const list = controls.getByRole("button", { name: "List layout" });
    const board = controls.getByRole("button", { name: "Board layout" });

    expect(filter).toHaveClass("trail-view-bar__action");
    expect(filter).toHaveAttribute("type", "button");
    expect(controls.queryByRole("button", { name: "Display" })).not.toBeInTheDocument();
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(board).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith("board");
  });

  it("lets a consumer omit trailing controls instead of manufacturing a generic action", () => {
    const { container } = render(
      <TrailViewBar
        label="Initiative focus controls"
        leading={(
          <TrailViewBarAction icon={<TestIcon name="filter-icon" />} label="Filter" />
        )}
      />,
    );

    const viewBar = screen.getByRole("group", { name: "Initiative focus controls" });
    const controls = within(viewBar);

    expect(controls.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(controls.queryByRole("button", { name: "Display" })).not.toBeInTheDocument();
    expect(container.querySelector(".trail-view-bar__trailing")).toBeNull();
  });
});
