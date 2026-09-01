import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

if (typeof window.ResizeObserver === "undefined") {
  const TrailTestResizeObserver = class implements ResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      void callback;
    }

    disconnect(): void {
      return;
    }

    observe(target: Element): void {
      void target;
    }

    unobserve(target: Element): void {
      void target;
    }
  };

  window.ResizeObserver = TrailTestResizeObserver;
  vi.stubGlobal("ResizeObserver", TrailTestResizeObserver);
}

afterEach(() => {
  cleanup();
});
