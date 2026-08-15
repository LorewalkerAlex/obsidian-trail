import { describe, expect, it, vi } from "vitest";

import {
  observeTrailActionCompletion,
  runTrailAction,
} from "./trail-action";

describe("Trail UI action interaction", () => {
  it("publishes acceptance and clears the previous error", () => {
    const onError = vi.fn();
    const onAccepted = vi.fn();
    const receipt = {
      completion: Promise.resolve(),
      id: "receipt-a",
    };

    expect(runTrailAction(() => receipt, onError, onAccepted)).toBe(receipt);
    expect(onAccepted).toHaveBeenCalledWith(receipt);
    expect(onError).toHaveBeenCalledWith(undefined);
  });

  it("maps synchronous action failures to UI error state", () => {
    const onError = vi.fn();

    expect(runTrailAction(() => {
      throw new Error("planning failed");
    }, onError)).toBeUndefined();
    expect(onError).toHaveBeenCalledWith("planning failed");
  });

  it("observes asynchronous completion failures", async () => {
    const onError = vi.fn();
    const completion = Promise.reject(new Error("persistence failed"));

    observeTrailActionCompletion({ completion }, onError);
    await completion.catch(() => undefined);

    expect(onError).toHaveBeenNthCalledWith(1, undefined);
    expect(onError).toHaveBeenNthCalledWith(2, "persistence failed");
  });
});
