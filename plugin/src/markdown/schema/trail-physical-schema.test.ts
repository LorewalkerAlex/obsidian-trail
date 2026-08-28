import { describe, expect, it } from "vitest";
import {
  TRAIL_PHYSICAL_RECORD_SCHEMAS,
  TRAIL_PHYSICAL_SOURCE_SCHEMAS,
} from "./trail-physical-schema";

describe("Trail physical schema registry", () => {
  it("owns the canonical Issue metadata order", () => {
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.metadataOrder).toEqual([
      "id",
      "context",
      "statusDefinitionId",
      "projectId",
      "milestoneId",
      "priority",
      "estimate",
      "due",
      "labelIds",
      "createdAt",
      "firstStartedAt",
      "terminalAt",
    ]);
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.fields.estimate.type).toBe("estimate");
  });

  it("distinguishes optional omission, empty sets, and derived fields", () => {
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.fields.due.missing).toBe("undefined");
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.issue.fields.labelIds.missing).toBe("empty-set");
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle.fields.label.missing).toBe("derived");
  });

  it("keeps current carrier owners explicit", () => {
    expect(Object.keys(TRAIL_PHYSICAL_SOURCE_SCHEMAS)).toEqual([
      "initiative",
      "project",
      "triage",
      "cycles",
    ]);
  });
});
