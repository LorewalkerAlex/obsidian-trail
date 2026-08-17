import { describe, expect, it } from "vitest";

import { createTrailTestConfiguration } from "../../test/trail-test-fixtures";
import {
  isTrailTerminalStatusDefinition,
  resolveTrailDefaultStatusDefinition,
  resolveTrailStatusDefinition,
} from "./trail-status-rules";

describe("Trail status rules", () => {
  it("resolves definitions through stable entity/category semantics", () => {
    const configuration = createTrailTestConfiguration();
    expect(resolveTrailDefaultStatusDefinition(configuration, "issue", "backlog").id)
      .toBe("issue-backlog");
    expect(resolveTrailStatusDefinition(configuration, "project", "issue-backlog"))
      .toBeUndefined();
    expect(isTrailTerminalStatusDefinition(
      resolveTrailDefaultStatusDefinition(configuration, "project", "completed"),
    )).toBe(true);
  });
});
