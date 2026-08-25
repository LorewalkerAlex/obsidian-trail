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
    expect(resolveTrailDefaultStatusDefinition(configuration, "project", "unstarted").id)
      .toBe("project-unstarted");
    expect(resolveTrailStatusDefinition(configuration, "project", "issue-backlog"))
      .toBeUndefined();
  });

  it("treats both Completed and Canceled as terminal categories", () => {
    const configuration = createTrailTestConfiguration();
    expect(isTrailTerminalStatusDefinition(
      resolveTrailDefaultStatusDefinition(configuration, "project", "completed"),
    )).toBe(true);
    expect(isTrailTerminalStatusDefinition(
      resolveTrailDefaultStatusDefinition(configuration, "project", "canceled"),
    )).toBe(true);
    expect(isTrailTerminalStatusDefinition(
      resolveTrailDefaultStatusDefinition(configuration, "project", "unstarted"),
    )).toBe(false);
  });
});
