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
  it("composes filter, binary layout, and display controls in one view bar", () => {
    const onValueChange = vi.fn();

    render(
      <TrailViewBar
        display={(
          <TrailViewBarAction icon={<TestIcon name="display-icon" />} label="Display" />
        )}
        filter={(
          <TrailViewBarAction icon={<TestIcon name="filter-icon" />} label="Filter" />
        )}
        label="Project workspace view controls"
        layout={(
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
    const display = controls.getByRole("button", { name: "Display" });
    const list = controls.getByRole("button", { name: "List layout" });
    const board = controls.getByRole("button", { name: "Board layout" });

    expect(filter).toHaveClass("trail-view-bar__action");
    expect(filter).toHaveAttribute("type", "button");
    expect(display).toHaveClass("trail-view-bar__action");
    expect(list).toHaveAttribute("aria-pressed", "true");
    expect(board).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(board);
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith("board");
  });

  it("lets List-only consumers omit the layout slot", () => {
    render(
      <TrailViewBar
        display={(
          <TrailViewBarAction icon={<TestIcon name="display-icon" />} label="Display" />
        )}
        filter={(
          <TrailViewBarAction icon={<TestIcon name="filter-icon" />} label="Filter" />
        )}
        label="Triage view controls"
      />,
    );

    const viewBar = screen.getByRole("group", { name: "Triage view controls" });
    const controls = within(viewBar);

    expect(controls.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(controls.getByRole("button", { name: "Display" })).toBeInTheDocument();
    expect(controls.queryByRole("group", { name: "Layout" })).not.toBeInTheDocument();
  });
});
