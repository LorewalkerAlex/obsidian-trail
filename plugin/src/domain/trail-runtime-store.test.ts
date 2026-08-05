import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { TrailVaultReadResult } from "./trail-vault-reader";
import { TrailRuntimeStore } from "./trail-runtime-store";

function createData(
  code: string,
): TrailVaultReadResult {
  return {
    areas: [],
    projects: [],
    issues: [
      {
        scope: "file",
        code,
        message: code,
        filePath: "Trail",
      },
    ],
  };
}

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve(value: Value): void;
}

function deferred<Value>(): Deferred<Value> {
  let resolvePromise: ((value: Value) => void) | undefined;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => {
      if (!resolvePromise) {
        throw new Error("Deferred promise is not ready.");
      }

      resolvePromise(value);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Trail runtime store", () => {
  it("initializes once and publishes parsed Vault data", async () => {
    const data = createData("initial");
    const pendingRead = deferred<TrailVaultReadResult>();
    const readData = vi.fn(() => pendingRead.promise);
    const store = new TrailRuntimeStore(readData);
    const listener = vi.fn();

    store.subscribe(listener);

    const firstInitialize = store.initialize();
    const secondInitialize = store.initialize();

    expect(readData).toHaveBeenCalledOnce();

    pendingRead.resolve(data);
    await Promise.all([
      firstInitialize,
      secondInitialize,
    ]);
    await store.initialize();

    expect(readData).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toEqual({
      data,
      isInitialized: true,
      isRefreshing: false,
    });
    expect(listener).toHaveBeenCalled();
  });

  it("keeps confirmed data while a refresh is in progress", async () => {
    const initialData = createData("initial");
    const refreshedData = createData("refreshed");
    const pendingRefresh = deferred<TrailVaultReadResult>();
    const readData = vi.fn()
      .mockResolvedValueOnce(initialData)
      .mockReturnValueOnce(pendingRefresh.promise);
    const store = new TrailRuntimeStore(readData);

    await store.initialize();

    const refreshPromise = store.refresh();

    expect(store.getSnapshot()).toEqual({
      data: initialData,
      isInitialized: true,
      isRefreshing: true,
    });

    pendingRefresh.resolve(refreshedData);
    await refreshPromise;

    expect(store.getSnapshot()).toEqual({
      data: refreshedData,
      isInitialized: true,
      isRefreshing: false,
    });
  });

  it("runs one trailing refresh when another refresh is requested", async () => {
    const firstRead = deferred<TrailVaultReadResult>();
    const secondRead = deferred<TrailVaultReadResult>();
    const readData = vi.fn()
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise);
    const store = new TrailRuntimeStore(readData);

    const initialRefresh = store.initialize();
    const trailingRefresh = store.refresh();

    expect(readData).toHaveBeenCalledOnce();

    firstRead.resolve(createData("first"));
    await Promise.resolve();
    await Promise.resolve();

    expect(readData).toHaveBeenCalledTimes(2);

    const finalData = createData("second");
    secondRead.resolve(finalData);
    await Promise.all([
      initialRefresh,
      trailingRefresh,
    ]);

    expect(store.getSnapshot().data).toBe(finalData);
  });

  it("debounces scheduled file-event refreshes", async () => {
    vi.useFakeTimers();

    const initialData = createData("initial");
    const refreshedData = createData("refreshed");
    const readData = vi.fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(refreshedData);
    const store = new TrailRuntimeStore(readData, 50);

    await store.initialize();

    store.scheduleRefresh();
    store.scheduleRefresh();

    expect(readData).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(50);

    expect(readData).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().data).toBe(refreshedData);
  });

  it("cancels a scheduled file-event refresh when refreshing directly", async () => {
    vi.useFakeTimers();

    const initialData = createData("initial");
    const refreshedData = createData("refreshed");
    const readData = vi.fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(refreshedData);
    const store = new TrailRuntimeStore(readData, 50);

    await store.initialize();

    store.scheduleRefresh();
    await store.refresh();

    expect(readData).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().data).toBe(refreshedData);

    await vi.advanceTimersByTimeAsync(50);

    expect(readData).toHaveBeenCalledTimes(2);
  });

  it("publishes a structured issue when the Vault read fails", async () => {
    const store = new TrailRuntimeStore(
      () => Promise.reject(new Error("Read failed.")),
    );

    await store.initialize();

    expect(store.getSnapshot()).toMatchObject({
      isInitialized: true,
      isRefreshing: false,
      data: {
        areas: [],
        projects: [],
        issues: [
          {
            scope: "file",
            code: "vault.read.failed",
            message:
              "Trail could not read the Vault: Read failed.",
            filePath: "Trail",
          },
        ],
      },
    });
  });

  it("cancels scheduled work and notifications when disposed", async () => {
    vi.useFakeTimers();

    const readData = vi.fn(
      () => Promise.resolve(createData("initial")),
    );
    const store = new TrailRuntimeStore(readData, 50);
    const listener = vi.fn();

    await store.initialize();
    store.subscribe(listener);
    store.scheduleRefresh();
    store.dispose();

    await vi.advanceTimersByTimeAsync(50);
    await store.refresh();

    expect(readData).toHaveBeenCalledOnce();
    expect(listener).not.toHaveBeenCalled();
  });
});
