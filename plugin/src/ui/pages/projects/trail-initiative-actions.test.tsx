import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TrailInitiative } from "../../../domain/model/trail-entities";
import type {
  TrailActionMenuPresenter,
  TrailActionMenuRequest,
} from "../../interactions/trail-action-menu";
import { TrailActionMenuProvider } from "../../interactions/trail-action-menu-context";
import { TrailInitiativeActions } from "./trail-initiative-actions";

function capturePresenter() {
  let request: {
    readonly items: TrailActionMenuRequest["items"];
    readonly onSelect: (actionId: string) => void | Promise<void>;
  } | undefined;
  const capture = <TActionId extends string>(nextRequest: TrailActionMenuRequest<TActionId>) => {
    request = {
      items: nextRequest.items,
      onSelect: (actionId) => {
        const item = nextRequest.items.find(({ id }) => id === actionId);
        if (item === undefined) throw new Error(`Unknown captured action: ${actionId}`);
        return nextRequest.onSelect(item.id);
      },
    };
  };
  const presenter: TrailActionMenuPresenter = {
    showAtMouseEvent() { /* unused */ },
    showAtPosition(_position, nextRequest) {
      capture(nextRequest);
    },
  };
  return { presenter, request: () => request };
}

const initiative: TrailInitiative = {
  id: "initiative-a",
  labelIds: [],
  title: "Initiative A",
};

describe("TrailInitiativeActions", () => {
  it("offers edit and delete, then confirms a preserving Initiative deletion", async () => {
    const menu = capturePresenter();
    const deleteInitiative = vi.fn(() => ({
      commandId: "delete-initiative",
      completion: Promise.resolve(),
      entityId: initiative.id,
    }));
    const onDeleted = vi.fn();

    render(
      <TrailActionMenuProvider presenter={menu.presenter}>
        <section className="trail-initiative-page">
          <TrailInitiativeActions
            actions={{ delete: deleteInitiative }}
            expectedInitiative={initiative}
            onDeleted={onDeleted}
            onEdit={vi.fn()}
            projectCount={2}
            writable
          />
        </section>
      </TrailActionMenuProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "More initiative actions" }));
    expect(menu.request()?.items.map(({ id }) => id)).toEqual([
      "initiative.edit",
      "initiative.delete",
    ]);
    await act(async () => {
      await menu.request()?.onSelect("initiative.delete");
    });

    expect(screen.getByRole("dialog", { name: 'Delete "Initiative A"?' }))
      .toHaveTextContent("2 projects become unassigned");
    fireEvent.click(screen.getByRole("button", { name: "Delete initiative" }));

    expect(deleteInitiative).toHaveBeenCalledWith(initiative);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
