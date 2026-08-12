import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

interface ValidationState {
  unrelated: number;
  visible: number;
}

type ValidationStore = StoreApi<ValidationState>;

function createValidationStore(): ValidationStore {
  return createStore<ValidationState>()(() => ({
    unrelated: 0,
    visible: 1,
  }));
}

describe("Zustand focused validation", () => {
  it("supports plugin-owned vanilla state and direct subscriptions", () => {
    const store = createValidationStore();
    const observedVisibleValues: number[] = [];

    const unsubscribe = store.subscribe((state) => {
      observedVisibleValues.push(state.visible);
    });

    store.setState({ visible: 2 });
    store.setState({ unrelated: 1 });
    unsubscribe();
    store.setState({ visible: 3 });

    expect(store.getState()).toEqual({
      unrelated: 1,
      visible: 3,
    });
    expect(observedVisibleValues).toEqual([2, 2]);
  });

  it("lets React subscribe to an injected vanilla store with selector isolation", () => {
    const store = createValidationStore();
    let renderCount = 0;

    function Probe({ validationStore }: { validationStore: ValidationStore }) {
      renderCount += 1;
      const visible = useStore(validationStore, (state) => state.visible);

      return <output data-testid="visible-value">{visible}</output>;
    }

    render(<Probe validationStore={store} />);

    expect(screen.getByTestId("visible-value")).toHaveTextContent("1");
    expect(renderCount).toBe(1);

    act(() => {
      store.setState({ unrelated: 7 });
    });

    expect(screen.getByTestId("visible-value")).toHaveTextContent("1");
    expect(renderCount).toBe(1);

    act(() => {
      store.setState({ visible: 2 });
    });

    expect(screen.getByTestId("visible-value")).toHaveTextContent("2");
    expect(renderCount).toBe(2);
  });
});
