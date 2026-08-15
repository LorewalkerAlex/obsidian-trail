import { describe, expect, it } from "vitest";

import { TRAIL_PHYSICAL_RECORD_SCHEMAS } from "./trail-physical-schema";

describe("Trail Physical Schema Registry", () => {
  it("keeps the frozen canonical metadata order for every record kind", () => {
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.initiative.metadataOrder).toEqual([
      "priority",
      "due",
      "labelIds",
    ]);
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.project.metadataOrder).toEqual([
      "statusDefinitionId",
      "initiativeId",
      "priority",
      "due",
      "labelIds",
    ]);
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.milestone.metadataOrder).toEqual([
      "id",
      "projectId",
      "due",
    ]);
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
    expect(TRAIL_PHYSICAL_RECORD_SCHEMAS.cycle.metadataOrder).toEqual([
      "id",
      "startedAt",
      "plannedEnd",
      "endedAt",
      "issueIds",
    ]);
  });
});
