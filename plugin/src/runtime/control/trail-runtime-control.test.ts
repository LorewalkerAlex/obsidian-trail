import { describe, expect, it } from "vitest";

import { isTrailRuntimeWritable } from "./trail-runtime-control";

describe("TrailRuntimeControl", () => {
  it("opens the mutation gate only while ready", () => {
    expect(isTrailRuntimeWritable({ kind: "ready" })).toBe(true);
    expect(isTrailRuntimeWritable({ kind: "loading" })).toBe(false);
    expect(isTrailRuntimeWritable({ kind: "refreshing" })).toBe(false);
    expect(isTrailRuntimeWritable({ kind: "read-only-error", message: "invalid" })).toBe(false);
  });
});
