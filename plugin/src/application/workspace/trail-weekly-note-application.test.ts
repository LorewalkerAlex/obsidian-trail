import { describe, expect, it, vi } from "vitest";

import { setTrailRuntimeControl } from "../../runtime/store/trail-runtime-store";
import { createTrailUiTestHarness } from "../../test/trail-ui-test-harness";
import { TrailApplicationUnavailableError } from "../trail-application-support";
import {
  TrailWeeklyNoteApplication,
  type TrailWeeklyNoteGateway,
} from "./trail-weekly-note-application";

function createGateway() {
  const archiveCurrent = vi.fn(async (date: string, current: string) => ({
    archives: [{ content: current, date }],
    current: "",
  }));
  const gateway: TrailWeeklyNoteGateway = {
    archiveCurrent,
    load: vi.fn(async () => ({ archives: [], current: "" })),
    replaceCurrent: vi.fn(async (current: string) => ({ archives: [], current })),
  };
  return { archiveCurrent, gateway };
}

describe("Trail Weekly Note Application", () => {
  it("archives using the configured Trail timezone rather than the host timezone", async () => {
    const harness = createTrailUiTestHarness();
    const { archiveCurrent, gateway } = createGateway();
    const application = new TrailWeeklyNoteApplication(
      harness.runtimeStore,
      gateway,
      {
        createId: () => "unused",
        now: () => Date.UTC(2026, 7, 18, 16, 30),
      },
    );

    await application.archiveCurrent("This week");
    expect(archiveCurrent).toHaveBeenCalledWith("2026-08-19", "This week");
  });

  it("allows reads but blocks utility writes while Runtime is not writable", async () => {
    const harness = createTrailUiTestHarness();
    const { gateway } = createGateway();
    const application = new TrailWeeklyNoteApplication(
      harness.runtimeStore,
      gateway,
      { createId: () => "unused", now: () => 1_800_000_000_000 },
    );
    setTrailRuntimeControl(harness.runtimeStore, { kind: "refreshing" });

    await expect(application.load()).resolves.toEqual({ archives: [], current: "" });
    expect(() => application.replaceCurrent("Blocked")).toThrow(TrailApplicationUnavailableError);
  });
});
