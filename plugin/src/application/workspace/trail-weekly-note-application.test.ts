import { describe, expect, it, vi } from "vitest";

import { setTrailRuntimeControl } from "../../runtime/store/trail-runtime-store";
import { createTrailTestRuntimeStore } from "../../test/trail-runtime-test-harness";
import { TrailApplicationUnavailableError } from "../trail-application-support";
import {
  TrailWeeklyNoteApplication,
  type TrailWeeklyNoteGateway,
} from "./trail-weekly-note-application";

function createGateway() {
  const archiveCurrent = vi.fn(async (
    date: string,
    _expectedCurrent: string,
    current: string,
  ) => ({
    archives: [{ content: current, date }],
    current: "",
  }));
  const replaceCurrent = vi.fn(async (_expectedCurrent: string, current: string) => ({
    archives: [],
    current,
  }));
  const gateway: TrailWeeklyNoteGateway = {
    archiveCurrent,
    load: vi.fn(async () => ({ archives: [], current: "" })),
    replaceCurrent,
  };
  return { archiveCurrent, gateway, replaceCurrent };
}

describe("Trail Weekly Note Application", () => {
  it("archives using the configured Trail timezone and the loaded Current precondition", async () => {
    const runtimeStore = createTrailTestRuntimeStore();
    const { archiveCurrent, gateway } = createGateway();
    const application = new TrailWeeklyNoteApplication(
      runtimeStore,
      gateway,
      {
        createId: () => "unused",
        now: () => Date.UTC(2026, 7, 18, 16, 30),
      },
    );

    await application.archiveCurrent("Loaded current", "This week");
    expect(archiveCurrent).toHaveBeenCalledWith(
      "2026-08-19",
      "Loaded current",
      "This week",
    );
  });

  it("passes the loaded Current precondition through replaceCurrent", async () => {
    const runtimeStore = createTrailTestRuntimeStore();
    const { gateway, replaceCurrent } = createGateway();
    const application = new TrailWeeklyNoteApplication(
      runtimeStore,
      gateway,
      { createId: () => "unused", now: () => 1_800_000_000_000 },
    );

    await application.replaceCurrent("Loaded current", "Edited current");
    expect(replaceCurrent).toHaveBeenCalledWith("Loaded current", "Edited current");
  });

  it("allows reads but blocks utility writes while Runtime is not writable", async () => {
    const runtimeStore = createTrailTestRuntimeStore();
    const { gateway } = createGateway();
    const application = new TrailWeeklyNoteApplication(
      runtimeStore,
      gateway,
      { createId: () => "unused", now: () => 1_800_000_000_000 },
    );
    setTrailRuntimeControl(runtimeStore, { kind: "refreshing" });

    await expect(application.load()).resolves.toEqual({ archives: [], current: "" });
    expect(() => application.replaceCurrent("Loaded", "Blocked"))
      .toThrow(TrailApplicationUnavailableError);
  });
});
